const WebSocket = require('ws');
const util = require('util');

const jsonrpc = '2.0';

// https://www.jsonrpc.org/specification
const JSON_RPC_ERROR_PARSE_ERROR = -32700;
const JSON_RPC_ERROR_INVALID_REQUEST = -32600;
const JSON_RPC_ERROR_METHOD_NOT_FOUND = -32601;
const JSON_RPC_ERROR_METHOD_INVALID_PARAMS = -32602;
const JSON_RPC_ERROR_METHOD_INTERNAL_ERROR = -32603;
// -32000 to -32099	Server error	Reserved for implementation-defined server-errors.

module.exports = class JsonRpcServer {
    constructor(port) {
        this.ws = new WebSocket.Server({port});
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
                let result = {};
                if (Array.isArray(reqObj)) {
                    if (reqObj.length === 0) {
                        result = {jsonrpc, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
                    } else {
                        result = [];
                        for (const req of reqObj) {
                            result.push(await that.singleCall(req));
                        }
                    }
                } else {
                    result = await that.singleCall(reqObj);
                }
                client.send(JSON.stringify(result));
            });
        });
    }

    addMethod(name, func ) {
        if (typeof func !== 'function') throw new Error('func not function');
        this.methods[name] = func;
    }

    async singleCall(req) {
        const {id, method, params} = req;
        if (typeof method === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }
        const func = this.methods[method];
        if (typeof func !== 'function') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }

        let result = null;
        const isPositional = Array.isArray(params);
        const isAsync = util.types.isAsyncFunction(func);

        try {
            if (isPositional) {
                result = isAsync ? func(...params) : await func(...params);
            } else {
                result = isAsync ? func(params) : await func(params);
            }
            return {id, jsonrpc, result};
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
;