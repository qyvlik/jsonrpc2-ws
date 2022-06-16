import WebSocket, {WebSocketServer} from "ws";
import {JSON_RPC_ERROR_LOST_CONNECTION, JSON_RPC_ERROR_PARSE_ERROR, jsonrpc} from './JsonRpcConst.js';

function safeCloseWebSocket(websocket, code, reason) {
    try {
        websocket.close(code, reason);
    } catch (error) {

    }
}

/**
 *
 * @param ws websocket or websocketService
 * @param jsonRpc
 * @returns {Promise<unknown>}
 */
async function checkWebSocketState(ws, jsonRpc) {
    const state = {done: false};
    return new Promise(async (resolve, reject) => {
        ws.on('open', () => {
            if (!state.done) {
                state.done = true;
                jsonRpc.ws = ws;
                resolve();
            }
        });

        ws.on('close', async () => {
            for (let [_, callback] of jsonRpc.callbacks) {
                try {
                    await callback({
                        jsonrpc,
                        error: {code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'}
                    });
                } catch (error) {
                    console.error(`jsonRpc.callbacks error:`, error);
                }
            }
            jsonRpc.callbacks.clear();

            if (!state.done) {
                state.done = true;
                jsonRpc.ws = null;
                reject();
            }
        });
        ws.on('error', async (error) => {
            if (!state.done) {
                state.done = true;
                jsonRpc.ws = null;
                reject(error);
            }
        });
    });
}

async function safeParseJSON(string) {
    try {
        return JSON.parse(string);
    } catch (error) {
        return undefined;
    }
}

export default class JsonRpcWS {

    static async startupServer(jsonRpc, port) {
        const webSocketServer = new WebSocketServer({
            port,
            clientTracking: true
        });

        webSocketServer.on('connection', async (websocket, request) => {

            if (jsonRpc.onConnectionInterceptor && !await jsonRpc.onConnectionInterceptor.open(websocket, request)) {
                safeCloseWebSocket(websocket)
                return;
            }

            websocket.on('close', async () => {
                await jsonRpc?.onConnectionInterceptor.close(websocket);
            });

            websocket.on('message', async (data, isBinary) => {
                if (jsonRpc.onMessageInterceptor && !await jsonRpc.onMessageInterceptor.previous(websocket, data, isBinary)) {
                    return;
                }

                const messageObject = await safeParseJSON(data);

                if (typeof messageObject === 'undefined') {
                    websocket.send(JSON.stringify({
                        jsonrpc,
                        error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}
                    }));
                    return;
                }

                const isRequest = typeof messageObject.method !== 'undefined';
                const response = isRequest ? await jsonRpc.handleRequest(websocket, messageObject)
                    : await jsonRpc.handleResponse(websocket, messageObject);

                await jsonRpc?.onMessageInterceptor.post(data, websocket, isBinary, response);

                if (typeof response !== 'undefined' && response !== null) {
                    websocket.send(JSON.stringify(response));
                }
            });
        });

        return await checkWebSocketState(webSocketServer, jsonRpc);
    }

    static async connectServer(jsonRpc, address) {
        const websocket = new WebSocket(address, {});
        websocket.on('message', async (data, isBinary) => {
            const messageObject = await safeParseJSON(data);

            // 客户端角色下，收到非 JSON 格式，不响应结果。
            if (typeof messageObject === 'undefined') {
                console.error(`onmessage parse error: message:${data}`);
                return;
            }

            const isRequest = typeof messageObject.method !== 'undefined';
            // 客户端模式不支持 JsonRpcOnMessageInterceptor 拦截器
            const response = isRequest ? await jsonRpc.handleRequest(websocket, messageObject)
                : await jsonRpc.handleResponse(websocket, messageObject);

            if (typeof response !== 'undefined' && response !== null) {
                websocket.send(JSON.stringify(response));
            }
        });

        return await checkWebSocketState(websocket, jsonRpc);
    }
}