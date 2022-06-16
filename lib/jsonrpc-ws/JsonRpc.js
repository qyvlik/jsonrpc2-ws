import JsonRpcMethod from './JsonRpcMethod.js';
import JsonRpcOnMessageInterceptor from './JsonRpcOnMessageInterceptor.js';
import JsonRpcOnRequestInterceptor from "./JsonRpcOnRequestInterceptor.js";
import JsonRpcOnConnectionInterceptor from './JsonRpcOnConnectionInterceptor.js';

import {
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR_LOST_CONNECTION,
    JSON_RPC_ERROR_METHOD_INTERNAL_ERROR,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    jsonrpc
} from './JsonRpcConst.js';

export default class JsonRpc {
    constructor({role}) {
        this.id = 0;
        this.role = role;
        this.methods = new Map();
        this.callbacks = new Map();
        this.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor();
        this.onMessageInterceptor = new JsonRpcOnMessageInterceptor();
        this.onRequestInterceptor = new JsonRpcOnRequestInterceptor();
        this.ws = null;
    }

    addMethod(method, func, concurrency) {
        if (typeof func !== 'function') {
            throw new Error('func not function');
        }
        if (method.startsWith("rpc.")) {
            throw new Error('Method names that begin with rpc. are reserved for system extensions, and MUST NOT be used for anything else');
        }
        this.methods.set(method, new JsonRpcMethod({func, concurrency}));
    }

    addExtensions(method, func, concurrency) {
        if (typeof func !== 'function') {
            throw new Error('func not function');
        }
        if (!method.startsWith("rpc.")) {
            throw new Error('Method names that MUST begin with rpc.');
        }
        this.methods.set(method, new JsonRpcMethod({func, concurrency}));
    }

    async handleRequest(websocket, request) {
        const that = this;

        if (!Array.isArray(request)) {
            return await that.singleCall(websocket, request);
        }

        if (request.length === 0) {
            return {jsonrpc, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }

        const result = [];
        for (const req of request) {
            const singleResult = await that.singleCall(websocket, req);
            if (singleResult !== null) {
                result.push(singleResult);
            }
        }

        return result;
    }

    async handleResponse(websocket, response) {
        const that = this;
        const resList = Array.isArray(response) ? response : [response];
        for (const resp of resList) {
            const {id} = resp;
            if (id === null || typeof id === 'undefined') {
                continue;
            }
            const callback = that.callbacks.get(id);
            if (callback) {
                await callback(resp);
            }
            that.callbacks.delete(id);
        }
    }

    /**
     *
     * @param req
     * @param websocket
     * @returns {Promise<{result: *, id, jsonrpc: string}|null|{id, jsonrpc: string, error: {code: number, message: string}}|{id, jsonrpc: string, error: {code: number, data, message: (string|*)}}>}
     */
    async singleCall(websocket, req) {
        const {id, method, params} = req;
        if (typeof method === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request'}};
        }
        const jsonRpcMethod = this.methods.get(method);
        if (typeof jsonRpcMethod === 'undefined') {
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }

        if (this.onRequestInterceptor && !await this.onRequestInterceptor.previous(req, websocket)) {
            return null;
        }

        try {
            const result = await jsonRpcMethod.call(params, websocket);

            await this?.onRequestInterceptor.post(req, websocket, result);

            if (typeof id !== 'undefined') {
                return {id, jsonrpc, result};
            }
            return null;
        } catch (error) {
            console.error(`singleCall error:${error}, req:${JSON.stringify(req)}`);
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
            throw {code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
        }
        const id = ++that.id;
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        return new Promise(async (resolve, reject) => {
            that.callbacks.set(id, (resObj) => {
                // TODO: 如果结构缺失，没有 error 也没有 result
                if (resObj.error) {
                    reject(resObj.error);
                } else {
                    resolve(resObj.result);
                }
            });

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
            throw {code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
        }
        const reqMsg = JSON.stringify({jsonrpc, method, params});
        await that.ws.send(reqMsg);
    }
}
