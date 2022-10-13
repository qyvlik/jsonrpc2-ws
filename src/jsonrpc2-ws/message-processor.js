import WebSocket from "ws";

import {
    errorIsValidate,
    idIsValidate,
    isRequest,
    isResponse, isType,
    jsonrpcError,
    paramsIsValidate,
    wrapperErrorData
} from "./utils.js";

import {
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    JSON_RPC_ERROR_PARSE_ERROR,
    jsonrpc,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_LOST_CONNECTION,
    JSON_RPC_ERROR_INVALID_RESPONSE,
    JSON_RPC_ERROR_WS_ERROR, JSON_RPC_ERROR_METHOD_INTERNAL_ERROR
} from "./constant.js";
import {JsonRpcMessageInterceptor, JsonRpcRequestInterceptor} from "./interceptors.js";

function safeParseJson(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        return undefined;
    }
}

export default class MessageProcessor {

    constructor(methods, callbacks, role, verbose = false) {
        this.methods = methods;
        this.callbacks = callbacks;
        this.role = role;
        this.verbose = verbose;
        /**
         * @type {{message: JsonRpcMessageInterceptor}}
         * @type {{request: JsonRpcRequestInterceptor}}
         */
        this.interceptor = {
            message: null,
            request: null
        };
    }

    /**
     *
     * @param websocket     {WebSocket}
     * @param data          {string|ArrayBuffer}
     * @param isBinary      {boolean}
     */
    async onMessage(websocket, data, isBinary) {

        if (this.verbose) {
            console.debug(`onMessage role=${this.role} data=${data}`);
        }

        const object = safeParseJson(data);
        if (typeof object === 'undefined') {
            MessageProcessor.sendParseError(websocket, null);
            return;
        }

        const isBatch = Array.isArray(object);
        const messageObjects = isBatch ? object : [object];

        if (messageObjects.length === 0) {
            MessageProcessor.sendInvalidRequest(websocket, null, undefined);
            return;
        }

        const messageInterceptor = this.interceptor.message;
        if (messageInterceptor instanceof JsonRpcMessageInterceptor &&
            !messageInterceptor.pre(data, isBinary, websocket)) {
            return;
        }
        const executeRequestInterceptor = this.interceptor.request instanceof JsonRpcRequestInterceptor;
        const requestInterceptor = executeRequestInterceptor ? this.interceptor.request : null;

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
                const response = await this.singleCall(messageObject, websocket, requestInterceptor);
                if (idIsValidate(response.id)) {
                    responses.push(response);
                }
            } else {
                if (this.callbacks.size > 0) {
                    const callback = this.callbacks.get(id);
                    this.callbacks.delete(id);
                    if (typeof callback == 'function') {
                        callback(messageObject);
                    }
                }
            }
        }

        if (responses.length > 0) {
            if (isBatch) {
                websocket.send(JSON.stringify(responses));
            } else {
                websocket.send(JSON.stringify(responses[0]));
            }
        }
    }

    /**
     *
     * @param id                    {string|number}
     * @param method                {string}
     * @param params                {object|array}
     * @param websocket             {WebSocket}
     * @param requestInterceptor    {JsonRpcRequestInterceptor}
     * @return {Promise<{id, jsonrpc: string, error: {code: number, message: string}}|{result: (null|*), id, jsonrpc: string}|{id, jsonrpc: string, error: {code: number, data: (string|{stack: *, name: *, message: *}), message: string}}>}
     */
    async singleCall({id, method, params}, websocket, requestInterceptor) {
        const jsonRpcMethod = this.methods.get(method);
        const jsonRpcMethodType = typeof jsonRpcMethod;
        if (jsonRpcMethodType === 'undefined') {
            return {id, jsonrpc, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }
        if (jsonRpcMethodType !== 'function') {
            return {id, jsonrpc, error: {code: JSON_RPC_ERROR_METHOD_INTERNAL_ERROR, message: 'Method not function'}};
        }

        try {
            const returnResponse = await requestInterceptor?.pre({id, method, params}, websocket);
            if (isType('object', returnResponse) && 'error' in returnResponse) {
                return returnResponse;
            }

            const result = await jsonRpcMethod(params, websocket);

            const response = {id, jsonrpc, result: typeof result === 'undefined' ? null : result};

            await requestInterceptor?.post(response, websocket);

            return response;
        } catch (error) {
            const data = wrapperErrorData(error);
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR, message: 'Server error', data}};
        }
    }

    static sendParseError(websocket, id) {
        websocket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}
        }));
    }

    static sendInvalidRequest(websocket, id, data) {
        websocket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request', data}
        }));
    }

    /**
     *
     * @param websocket             {WebSocket}
     * @param id                    {string|number|undefined}
     * @param method                {string}
     * @param params                {object|array}
     * @param callbacks             {Map<string,function>|undefined}
     * @return {Promise<object>}
     */
    async sendRequest(websocket, {id, method, params}, callbacks = undefined) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        if (websocket == null || websocket.readyState !== WebSocket.OPEN) {
            throw {jsonrpc, code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
        }
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        return new Promise(async (resolve, reject) => {
            const needCallback = typeof callbacks !== 'undefined';
            if (needCallback && idIsValidate(id)) {
                callbacks.set(id, (response) => {
                    const {error, result} = response;
                    if ('result' in response) {
                        resolve(result);
                    } else {
                        reject(errorIsValidate(error) ? error : {
                            jsonrpc,
                            code: JSON_RPC_ERROR_INVALID_RESPONSE,
                            message: 'Invalid response',
                            data: error
                        });
                    }
                });
            }

            if (this.verbose) {
                console.debug(`sendRequest role=${this.role} reqMsg=${reqMsg}`);
            }

            const wrapperReject = (error) => reject(jsonrpcError(JSON_RPC_ERROR_WS_ERROR, 'WebSocket error', error));
            try {
                websocket.send(reqMsg, (error) => {
                    if (typeof error !== 'undefined') {
                        wrapperReject(error);
                    }
                });
            } catch (error) {
                wrapperReject(error);
            }

            if (!needCallback) {
                resolve();
            }
        });
    }
}