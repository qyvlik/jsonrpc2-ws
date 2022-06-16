import PQueue from 'p-queue';
import util from 'util';
import WebSocket, {WebSocketServer} from "ws";
import JsonRpcOnConnectionInterceptor from './JsonRpcOnConnectionInterceptor.js'
import JsonRpcOnMessageInterceptor from './JsonRpcOnMessageInterceptor.js'
import JsonRpcOnRequestInterceptor from "./JsonRpcOnRequestInterceptor.js";

const jsonrpc = '2.0';

// https://www.jsonrpc.org/specification
// https://wiki.geekdream.com/Specification/json-rpc_2.0.html
const JSON_RPC_ERROR_PARSE_ERROR = -32700;
const JSON_RPC_ERROR_INVALID_REQUEST = -32600;
const JSON_RPC_ERROR_METHOD_NOT_FOUND = -32601;
const JSON_RPC_ERROR_METHOD_INVALID_PARAMS = -32602;
const JSON_RPC_ERROR_METHOD_INTERNAL_ERROR = -32603;

// -32000 to -32099	Server error	Reserved for implementation-defined server-errors.

class Method {
    constructor({func, concurrency}) {
        const limit = typeof concurrency !== 'undefined' && Number.isInteger(concurrency) && concurrency > 0;
        this.func = func;
        this.queue = limit ? new PQueue({concurrency}) : null;
    }

    async call(params, websocket) {
        const that = this;
        if (that.queue !== null) {
            return await that.queue.add(async () => await that.execute(params, websocket));
        }
        return await that.execute(params, websocket);
    }

    async execute(params, websocket) {
        const {func} = this;
        const isAsync = util.types.isAsyncFunction(func);
        return isAsync ? func(params, websocket) : await func(params, websocket);
    }
}

function safeCloseWebSocket(websocket, code, reason) {
    try {
        websocket.close(code, reason);
    } catch (error) {

    }
}

function safeTakeProperty(object, defaultValue, ...properties) {
    let next = object;
    if (next === null || typeof next === 'undefined') {
        return defaultValue;
    }
    for (const property of properties) {
        next = next[property];
        if (next === null || typeof next === 'undefined') {
            return defaultValue;
        }
    }
    return next;
}

/**
 *
 * @param ws websocket or websocketService
 * @param jsonRpc
 * @returns {Promise<unknown>}
 */
async function checkWebSocketState(ws, jsonRpc) {
    const state = {done: false};
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            if (!state.done) {
                state.done = true;
                jsonRpc.ws = ws;
                resolve();
            }
        });

        ws.on('close', () => {
            if (!state.done) {
                state.done = true;
                jsonRpc.ws = null;
                reject();
            }
        });
        ws.on('error', (error) => {
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

        const onConnectionPrevious = safeTakeProperty(jsonRpc,
            async () => true,
            'onConnectionInterceptor', 'previous');

        const previousResult = await onConnectionPrevious(websocket, request);
        if (!previousResult) {
            safeCloseWebSocket(websocket)
            return;
        }

        websocket.on('message', async (data, isBinary) => {

            const onMessagePrevious = safeTakeProperty(jsonRpc,
                async () => true,
                'onMessageInterceptor', 'previous');

            if (!await onMessagePrevious(websocket, data, isBinary)) {
                return;
            }

            const result = await jsonRpc.handleRequest(websocket, data, isBinary);

            const onMessagePost = safeTakeProperty(jsonRpc,
                async () => true,
                'onMessageInterceptor', 'post');

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

export default class JsonRpc {
    constructor() {
        this.id = 0;
        this.methods = {};
        this.callbacks = {};
        this.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor();
        this.onMessageInterceptor = new JsonRpcOnMessageInterceptor();
        this.onRequestInterceptor = new JsonRpcOnRequestInterceptor();
        this.ws = null;
    }

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

    addMethod(method, func, concurrency) {
        if (typeof func !== 'function') {
            throw new Error('func not function');
        }
        if (method.startsWith("rpc.")) {
            throw new Error('Method names that begin with rpc. are reserved for system extensions, and MUST NOT be used for anything else');
        }
        this.methods[method] = new Method({func, concurrency});
    }

    addExtensions(method, func, concurrency) {
        if (typeof func !== 'function') {
            throw new Error('func not function');
        }
        if (!method.startsWith("rpc.")) {
            throw new Error('Method names that MUST begin with rpc.');
        }
        this.methods[method] = new Method({func, concurrency});
    }

    async handleRequest(websocket, data, isBinary) {
        const that = this;
        let reqObj = null;
        try {
            reqObj = JSON.parse(data);
        } catch (error) {
            return {jsonrpc, error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}};
        }

        if (!Array.isArray(reqObj)) {
            return await that.singleCall(reqObj, websocket);
        }

        if (reqObj.length === 0) {
            return {jsonrpc, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }

        const result = [];
        for (const req of reqObj) {
            const singleResult = await that.singleCall(req, websocket);
            if (singleResult !== null) {
                result.push(singleResult);
            }
        }

        return result;
    }

    async handleResponse(websocket, data, isBinary) {
        const that = this;
        let resObj = null;
        try {
            resObj = JSON.parse(data);
        } catch (error) {
            console.error(`onmessage parse error: message:${data}, ${error.message}`);
            return;
        }

        const isArray = Array.isArray(resObj);
        const resList = isArray ? resObj : [resObj];
        for (const res of resList) {
            const {id} = res;
            if (id === null || typeof id === 'undefined') {
                continue;
            }
            const callback = that.callbacks[res.id];
            if (callback) {
                await callback(resObj);
            }
            delete that.callbacks[resObj.id];
        }
    }

    /**
     *
     * @param req
     * @param websocket
     * @returns {Promise<{result: *, id, jsonrpc: string}|null|{id, jsonrpc: string, error: {code: number, message: string}}|{id, jsonrpc: string, error: {code: number, data, message: (string|*)}}>}
     */
    async singleCall(req, websocket) {
        const {id, method, params} = req;
        if (typeof method === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }
        const functor = this.methods[method];
        if (typeof functor === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }

        const onRequestPrevious = safeTakeProperty(this,
            async () => true,
            'onRequestInterceptor', 'previous');

        if (!await onRequestPrevious(req, websocket)) {
            safeCloseWebSocket(websocket);
            return null;
        }

        try {
            const result = await functor.call(params, websocket);

            const onRequestPost = safeTakeProperty(this,
                async () => true,
                'onRequestInterceptor', 'post');

            await onRequestPost(req, websocket, result)

            if (typeof id !== 'undefined') {
                return {id, jsonrpc, result};
            }
            return null;
        } catch (error) {
            console.error(`error:${error}`);
            return {
                jsonrpc,
                id,
                error: {code: JSON_RPC_ERROR_METHOD_INTERNAL_ERROR, message: error.message, data: error}
            };
        }
    }

    async request(method, params) {
        const that = this;
        if (that.ws == null) {
            throw {code: -32001, message: 'Lost connection!'};
        }
        const id = ++that.id;
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        return new Promise(async (resolve, reject) => {
            that.callbacks[id] = (resObj) => {
                if (resObj.error) {
                    reject(resObj.error);
                } else {
                    resolve(resObj.result);
                }
            };

            try {
                await that.ws.send(reqMsg);
            } catch (error) {
                reject(error);
            }
        });
    }

    async notification(method, params) {
        const that = this;
        if (that.ws == null) {
            throw {code: -32001, message: 'Lost connection!'};
        }
        const reqMsg = JSON.stringify({jsonrpc, method, params});
        await that.ws.send(reqMsg);
    }
}
