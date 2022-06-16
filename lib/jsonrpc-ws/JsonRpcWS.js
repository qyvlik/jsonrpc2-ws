import WebSocket, {WebSocketServer} from "ws";

import JsonRpc from './JsonRpc.js'
import {JSON_RPC_ERROR_PARSE_ERROR, jsonrpc} from './JsonRpcConst.js';

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

async function startupServer(jsonRpc, port) {
    const webSocketServer = new WebSocketServer({
        port,
        clientTracking: true
    });

    webSocketServer.on('connection', async (websocket, request) => {

        const onConnectionPrevious = jsonRpc?.onConnectionInterceptor?.previous || (() => true);

        const previousResult = await onConnectionPrevious(websocket, request);
        if (!previousResult) {
            safeCloseWebSocket(websocket)
            return;
        }

        websocket.on('message', async (data, isBinary) => {

            const onMessagePrevious = jsonRpc?.onMessageInterceptor?.previous || (() => true);
            if (!await onMessagePrevious(websocket, data, isBinary)) {
                return;
            }

            let request = null;
            try {
                request = JSON.parse(data);
            } catch (error) {
                let result = {jsonrpc, error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}};
            }

            const result = await jsonRpc.handleRequest(websocket, data, isBinary);

            const onMessagePost = jsonRpc?.onMessageInterceptor?.post || (() => true);
            await onMessagePost(data, websocket, isBinary, result);

            if (result !== null) {
                websocket.send(JSON.stringify(result));
            }
        });
    });

    return await checkWebSocketState(webSocketServer, jsonRpc);
}

async function connectServer(jsonRpc, address) {
    const websocket = new WebSocket(address, {});
    websocket.on('message', async (data, isBinary) => {
        await jsonRpc.handleResponse(websocket, data, isBinary);
    });

    return await checkWebSocketState(websocket, jsonRpc);
}

export default class JsonRpcWS {
    static async createServer(port, {
        onConnectionHandle,
        onMessagePreviousHandle, onMessagePostHandle,
        onRequestPreviousHandle, onRequestPostHandle
    }) {
        const jsonRpc = new JsonRpc();
        jsonRpc.onConnectionInterceptor.setHandle(onConnectionHandle);
        jsonRpc.onMessageInterceptor.setPreviousHandle(onMessagePreviousHandle);
        jsonRpc.onMessageInterceptor.setPostHandle(onMessagePostHandle);
        jsonRpc.onRequestInterceptor.setPreviousHandle(onRequestPreviousHandle);
        jsonRpc.onRequestInterceptor.setPostHandle(onRequestPostHandle);
        await startupServer(jsonRpc, port);
        return jsonRpc;
    }

    static async createClient(address) {
        const jsonRpc = new JsonRpc();
        await connectServer(jsonRpc, address);
        return jsonRpc;
    }
}