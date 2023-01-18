import {
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR_INVALID_RESPONSE,
    JSON_RPC_ERROR_LOST_CONNECTION,
    JSON_RPC_ERROR_METHOD_INTERNAL_ERROR,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    JSON_RPC_ERROR_PARSE_ERROR,
    JSON_RPC_ERROR_WS_ERROR,
    jsonrpc
} from "./constant.js";

import {errorIsValidate, idIsValidate, isRequest, isResponse, wrapperErrorData} from "./utils.js";
import JsonRpcError from "./jsonrpc-error.js";

function safeParseJson(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        return undefined;
    }
}

export default class JsonRpcMessageHandler {
    /**
     *
     * @param role              {"client"|"server"}
     * @param verbose           {boolean}
     */
    constructor(role, verbose = false) {
        this.methods = new Map();
        this.callbacks = new Map();
        this.role = role;
        this.verbose = verbose;
    }

    /**
     *
     * @param name      {string}    method name
     * @param method    {function}  method instance
     */
    setMethod(name, method) {
        if (typeof method !== 'function') {
            throw new Error(`method not function`);
        }
        this.methods.set(name, method);
    }

    /**
     *
     * @param id                        {number|string}
     * @param method                    {string}
     * @param params                    {object|array}
     * @param socket                    {JsonRpcAbstractSocket}
     * @return {Promise<unknown>}
     */
    async getMethod({id, method, params}, socket) {
        return this.methods.get(method);
    }

    /**
     *
     * @param id                {number|string}
     * @param cb                {Function}
     */
    setCallback(id, cb) {
        this.callbacks.set(id, cb);
    }

    /**
     *
     * @param id                {number|string}
     * @param response          {any}
     * @return {Promise<void>}
     */
    async callback(id, response) {
        if (this.callbacks.size > 0) {
            const callback = this.callbacks.get(id);
            this.callbacks.delete(id);
            if (typeof callback == 'function') {
                await callback(response);
            }
        }
    }

    /**
     *
     * @param socket        {JsonRpcAbstractSocket}
     * @param id            {number|string|null|undefined}
     */
    static async sendParseError(socket, id) {
        await socket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}
        }), undefined);
    }

    /**
     *
     * @param socket        {JsonRpcAbstractSocket}
     * @param id            {number|string|null}
     * @param data          {object|undefined}
     */
    static async sendInvalidRequest(socket, id, data) {
        await socket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request', data}
        }), undefined);
    }

    /**
     *
     * @param socket        {JsonRpcAbstractSocket}
     * @param data          {string|ArrayBuffer}
     * @param isBinary      {boolean}
     */
    async onMessage(socket, data, isBinary) {
        if (this.verbose) {
            console.debug(`${this.role === 'client' ? `<--` : '-->'} ${data}`);
        }

        const object = safeParseJson(data);
        if (typeof object === 'undefined') {
            await JsonRpcMessageHandler.sendParseError(socket, null);
            return;
        }

        const isBatch = Array.isArray(object);
        const messageObjects = isBatch ? object : [object];
        if (messageObjects.length === 0) {
            await JsonRpcMessageHandler.sendInvalidRequest(socket, null, undefined);
            return;
        }

        const responses = [];
        for (const messageObject of messageObjects) {
            const isReq = isRequest(messageObject);
            const isResp = isResponse(messageObject);
            const {id} = messageObject;
            if ((!isReq && !isResp)) {
                responses.push({
                    id: idIsValidate(id) ? id : null,
                    jsonrpc,
                    error: {
                        code: JSON_RPC_ERROR_INVALID_REQUEST,
                        message: 'Invalid Request',
                        data: 'Neither request nor response'
                    }
                });
                continue;
            }

            if ((isReq && isResp)) {
                responses.push({
                    id: idIsValidate(id) ? id : null,
                    jsonrpc,
                    error: {
                        code: JSON_RPC_ERROR_INVALID_REQUEST,
                        message: 'Invalid Request',
                        data: 'Both request and response'
                    }
                });
                continue;
            }

            if (isReq) {
                const response = await this.singleCall(messageObject, socket);
                if (idIsValidate(response.id)) {
                    responses.push(response);
                }
            } else {
                await this.callback(id, messageObject);
            }
        }

        if (responses.length > 0) {
            if (isBatch) {
                await socket.send(JSON.stringify(responses), undefined);
            } else {
                await socket.send(JSON.stringify(responses[0]), undefined);
            }
        }
    }

    /**
     *
     * @param id                    {string|number}
     * @param method                {string}
     * @param params                {object|array}
     * @param socket                {JsonRpcAbstractSocket}
     * @return {Promise<{id, jsonrpc: string, error: {code: number, message: string}}|{result: (null|*), id, jsonrpc: string}|{id, jsonrpc: string, error: {code: number, data: (string|{stack: *, name: *, message: *}), message: string}}>}
     */
    async singleCall({id, method, params}, socket) {
        const jsonRpcMethod = await this.getMethod({id, method, params}, socket);
        const jsonRpcMethodType = typeof jsonRpcMethod;
        if (jsonRpcMethodType === 'undefined') {
            return {id, jsonrpc, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }
        if (jsonRpcMethodType !== 'function') {
            return {id, jsonrpc, error: {code: JSON_RPC_ERROR_METHOD_INTERNAL_ERROR, message: 'Method not function'}};
        }
        try {
            const result = await jsonRpcMethod(params, socket);

            return {id, jsonrpc, result: typeof result === 'undefined' ? null : result};
        } catch (error) {
            if (error instanceof JsonRpcError) {
                return {jsonrpc, id, error};
            }
            const data = wrapperErrorData(error);
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR, message: 'Server error', data}};
        }
    }


    /**
     *
     * @param socket                {JsonRpcAbstractSocket}
     * @param id                    {string|number|undefined}
     * @param method                {string}
     * @param params                {object|array}
     * @return {Promise<object>}
     */
    async sendRequest(socket, {id, method, params}) {
        if (socket == null || !(await socket.isOpen())) {
            throw {code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
        }
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});

        return new Promise(async (resolve, reject) => {
            if (idIsValidate(id)) {
                const cb = (response) => {
                    const {error, result} = response;
                    if ('result' in response) {
                        resolve(result);
                    } else {
                        reject(errorIsValidate(error) ? error : {
                            code: JSON_RPC_ERROR_INVALID_RESPONSE,
                            message: 'Invalid response',
                            data: error
                        });
                    }
                };
                this.setCallback(id, cb);
            }

            try {
                await socket.send(reqMsg, (error) => {
                    if (typeof error !== 'undefined') {
                        reject({code: JSON_RPC_ERROR_WS_ERROR, message: 'Network error', data: wrapperErrorData(error)})
                    }
                });
            } catch (error) {
                reject({code: JSON_RPC_ERROR_WS_ERROR, message: 'Network error', data: wrapperErrorData(error)})
            }

            if (!idIsValidate(id)) {
                resolve();
            }
        });
    }

    /**
     *
     * @param socket                {JsonRpcAbstractSocket}
     * @param requests              {array}
     * @param needResponseCount     {number}
     * @return {Promise<array>}
     */
    async sendRequests(socket, requests, needResponseCount) {
        if (socket == null || !(await socket.isOpen())) {
            throw {code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
        }

        const reqMsg = JSON.stringify(requests);

        return new Promise(async (resolve, reject) => {
            const responses = [];
            for (const request of requests) {
                const {id} = request;
                if (!idIsValidate(id)) {
                    continue;
                }
                const cb = (response) => {
                    responses.push(response);
                    if (responses.length === needResponseCount) {
                        resolve(responses);
                    }
                };
                this.setCallback(id, cb);
            }

            try {
                await socket.send(reqMsg, (error) => {
                    if (typeof error !== 'undefined') {
                        reject({code: JSON_RPC_ERROR_WS_ERROR, message: 'Network error', data: wrapperErrorData(error)})
                    }
                });
            } catch (error) {
                reject({code: JSON_RPC_ERROR_WS_ERROR, message: 'Network error', data: wrapperErrorData(error)})
            }

            if (needResponseCount === 0) {
                resolve([]);
            }
        });
    }
}