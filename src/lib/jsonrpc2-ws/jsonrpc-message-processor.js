import WebSocket from "ws";
import {idIsValidate, isRequest, isResponse} from "./utils.js";
import {
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_NOT_FOUND, JSON_RPC_ERROR_PARSE_ERROR,
    jsonrpc
} from "./constant.js";

export default class MessageProcessor {
    constructor(methods, callbacks, name) {
        this.methods = methods;
        this.callbacks = callbacks;
        this.name = name;
    }

    /**
     *
     * @param websocket     {WebSocket}
     * @param data          {string|ArrayBuffer}
     * @param isBinary      {boolean}
     */
    async onMessage(websocket, data, isBinary) {

        // console.info(`name=${this.name} data=${data}`);

        const object = MessageProcessor.safeParseJson(data);
        if (typeof object === 'undefined') {
            MessageProcessor.sendParseError(websocket);
            return;
        }

        const isBatch = Array.isArray(object);
        const messageObjects = isBatch ? object : [object];
        const responses = [];
        for (const messageObject of messageObjects) {
            const isReq = isRequest(messageObject);
            const isResp = isResponse(messageObject);
            const {id} = messageObject;
            if ((!isReq && !isResp) && idIsValidate(id)) {
                responses.push({
                    id,
                    jsonrpc,
                    error: {
                        code: JSON_RPC_ERROR_INVALID_REQUEST,
                        message: 'Invalid Request',
                        data: 'Neither request nor response'
                    }
                });
                continue;
            }

            if ((isReq && isResp) && idIsValidate(id)) {
                responses.push({
                    id,
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
                const response = await this.singleCall(messageObject, websocket);
                if (idIsValidate(response.id)) {
                    responses.push(response);
                }
            } else {
                const callback = this.callbacks.get(id);
                this.callbacks.delete(id);
                if (typeof callback == 'function') {
                    callback(messageObject);
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

    async singleCall({id, method, params}, websocket) {
        const jsonRpcMethod = this.methods.get(method);
        if (typeof jsonRpcMethod === 'undefined') {
            return {id, jsonrpc, error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}};
        }
        try {
            const result = await jsonRpcMethod.invoke(params, websocket);
            return {id, jsonrpc, result: typeof result === 'undefined' ? null : result};
        } catch (error) {
            const data = error instanceof Error
                ? {message: error.message, stack: error.stack, name: error.name}
                : error + '';
            return {jsonrpc, id, error: {code: JSON_RPC_ERROR, message: 'Server error', data}};
        }
    }

    static safeParseJson(data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            return undefined;
        }
    }

    static sendParseError(websocket, id) {
        websocket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_PARSE_ERROR, message: 'Parse error'}
        }));
    }

    static sendMethodNotFound(websocket) {
        websocket.send(JSON.stringify({
            id: null,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_METHOD_NOT_FOUND, message: 'Method not found'}
        }));
    }

    static sendInvalidRequest(websocket, id, data) {
        websocket.send(JSON.stringify({
            id,
            jsonrpc,
            error: {code: JSON_RPC_ERROR_INVALID_REQUEST, message: 'Invalid Request', data}
        }));
    }
}