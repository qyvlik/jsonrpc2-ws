import PQueue from 'p-queue';
import util from 'util';
import WebSocket, {WebSocketServer} from "ws";

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

    async call(params) {
        const that = this;
        if (that.queue !== null) {
            return await that.queue.add(await that.execute(params));
        }
        return await that.execute(params);
    }

    async execute(params) {
        const that = this;
        const isPositional = Array.isArray(params);
        const isAsync = util.types.isAsyncFunction(that.func);
        if (isPositional) {
            return isAsync ? that.func(...params) : await that.func(...params);
        } else {
            return isAsync ? that.func(params) : await that.func(params);
        }
    }
}

async function __checkWebSocketState(ws) {
    const state = {done: false};
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            if (!state.done) {
                state.done = true;
                resolve();
            }
        });

        ws.on('close', () => {
            if (!state.done) {
                state.done = true;
                reject();
            }
        });
        ws.on('error', (error) => {
            if (!state.done) {
                state.done = true;
                reject(error);
            }
        });
    });
}

async function startupServer(jsonRpc, port) {
    const ws = new WebSocketServer({
        port,
        clientTracking: true
    });

    ws.on('connection', (client) => {
        client.on('message', async (message) => {
            const result = await jsonRpc.handleRequest(message);
            if (result !== null) {
                client.send(JSON.stringify(result));
            }
        });
    });

    return await __checkWebSocketState(ws);
}

async function connectServer(jsonRpc, address) {
    const ws = new WebSocket(address, {});
    ws.on('message', async (message) => {
        let resObj = null;
        try {
            resObj = JSON.parse(message);
        } catch (error) {
            console.error(`onmessage parse error: message:${message}, ${error.message}`);
            return;
        }

        const isArray = Array.isArray(resObj);
        const resList = isArray ? resObj : [resObj];
        for (const res of resList) {
            const {id} = res;
            if (id) {
                const callback = jsonRpc.callbacks[res.id];
                if (callback) {
                    callback(resObj);
                    delete jsonRpc.callbacks[resObj.id];
                }
            }
        }
    });

    return await __checkWebSocketState(ws);
}

export default class JsonRpc {
    constructor() {
        this.id = 0;
        this.methods = {};
        this.callbacks = {};
        this.sender = null;
    }

    static async createServer(port,) {
        const jsonRpc = new JsonRpc();

        jsonRpc.addMethod('ping', () => {
            return Date.now();
        }, 1);

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

    async handleRequest(message) {
        const that = this;
        let reqObj = null;
        try {
            reqObj = JSON.parse(message);
        } catch (error) {
            return {jsonrpc, error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}};
        }

        if (!Array.isArray(reqObj)) {
            return await that.singleCall(reqObj);
        }

        if (reqObj.length === 0) {
            return {jsonrpc, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }

        const result = [];
        for (const req of reqObj) {
            const singleResult = await that.singleCall(req);
            if (singleResult !== null) {
                result.push(singleResult);
            }
        }

        return result;
    }

    async singleCall(req) {
        const {id, method, params} = req;
        if (typeof method === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }
        const functor = this.methods[method];
        if (typeof functor === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }

        try {
            const result = await functor.call(params);
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

    async request(ws, method, params) {
        const that = this;
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
                await ws.send(reqMsg);
            } catch (error) {
                reject(error);
            }
        });
    }

    async notification(ws, method, params) {
        const that = this;
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        await ws.send(reqMsg);
    }
}
