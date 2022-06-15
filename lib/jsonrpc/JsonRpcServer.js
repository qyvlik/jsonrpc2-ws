import {WebSocketServer} from 'ws';

import PQueue from 'p-queue';
import util from 'util';

const jsonrpc = '2.0';

// https://www.jsonrpc.org/specification
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

export default class JsonRpcServer {
    constructor(port,) {
        this.ws = new WebSocketServer({
            port,
            clientTracking: true
        });
        this.methods = {};
        const that = this;
        that.ws.on('connection', (client) => {
            client.on('message', async (message) => {
                let reqObj = null;
                try {
                    reqObj = JSON.parse(message);
                } catch (error) {
                    client.send(JSON.stringify({
                        jsonrpc,
                        error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}
                    }));
                    return;
                }
                let result = null;
                if (Array.isArray(reqObj)) {
                    if (reqObj.length === 0) {
                        result = {jsonrpc, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
                    } else {
                        result = [];
                        for (const req of reqObj) {
                            const singleResult = await that.singleCall(req);
                            if (singleResult !== null) {
                                result.push(singleResult);
                            }
                        }
                    }
                } else {
                    result = await that.singleCall(reqObj);
                }

                if (result !== null) {
                    client.send(JSON.stringify(result));
                }
            });
        });
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
}
