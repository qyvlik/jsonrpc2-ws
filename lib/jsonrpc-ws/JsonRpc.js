import JsonRpcMethod from './JsonRpcMethod.js';
import JsonRpcOnMessageInterceptor from './JsonRpcOnMessageInterceptor.js';
import JsonRpcOnRequestInterceptor from "./JsonRpcOnRequestInterceptor.js";
import JsonRpcOnConnectionInterceptor from './JsonRpcOnConnectionInterceptor.js';

import {
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR_METHOD_INTERNAL_ERROR,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    JSON_RPC_ERROR_PARSE_ERROR,
    jsonrpc
} from './JsonRpcConst.js';

export default class JsonRpc {
    constructor(role) {
        this.id = 0;
        this.role = role;
        this.methods = {};
        this.callbacks = {};
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
        this.methods[method] = new JsonRpcMethod({func, concurrency});
    }

    addExtensions(method, func, concurrency) {
        if (typeof func !== 'function') {
            throw new Error('func not function');
        }
        if (!method.startsWith("rpc.")) {
            throw new Error('Method names that MUST begin with rpc.');
        }
        this.methods[method] = new JsonRpcMethod({func, concurrency});
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

        const onRequestPrevious = this?.onRequestInterceptor?.previous || (() => true);

        if (!await onRequestPrevious(req, websocket)) {
            return null;
        }

        try {
            const result = await functor.call(params, websocket);

            const onRequestPost = this?.onRequestInterceptor?.post || (() => true);

            await onRequestPost(req, websocket, result)

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
