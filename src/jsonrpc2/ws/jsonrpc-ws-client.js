import {EventEmitter} from "events";
import WebSocket from "ws";

import JsonRpcWsSocket from "./jsonrpc-ws-socket.js";
import JsonRpcMessageHandler from "../core/jsonrpc-message-handler.js";
import {paramsIsValidate} from "../core/utils.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "../core/constant.js";
import JsonRpcPipeline from "../core/jsonrpc-pipeline.js";

export default class JsonRpcWsClient extends EventEmitter {
    /**
     * Create a `JsonRpcClient` instance.
     * @param {(String|URL)} address The URL to which to connect
     * @param {(String|String[])} [protocols] The subprotocols
     * @param {Object} [options] Connection options
     */
    constructor(address, protocols, options) {
        super();
        let id = 0;
        this.idGenerator = () => id++;
        /**
         *
         * @type {WebSocket}
         */
        this.ws = new WebSocket(address, protocols, options);
        this.socket = new JsonRpcWsSocket(this.ws);
        this.handler = new JsonRpcMessageHandler(`client`, false);
        const that = this;
        this.socket.once('open', () => that.emit('open'));
        this.socket.once('close', () => that.emit('close'));
        this.socket.on('message', async (data, isBinary) => {
            await that.handler.onMessage(that.sender, data, isBinary);
        });
    }

    /**
     *
     * @param name      {string}    method name
     * @param method    {function}  method instance
     */
    addMethod(name, method) {
        this.handler.setMethod(name, method);
    }

    /**
     * @param method            {string}
     * @param params            {object|[]}
     * @return {Promise<object>}
     */
    async notification(method, params) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        return await this.handler.sendRequest(this.socket, {method, params});
    }

    /**
     * @param method            {string}
     * @param params            {object|[]}
     * @return {Promise<object>}
     */
    async request(method, params) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        const id = await this.idGenerator();
        return await this.handler.sendRequest(this.socket, {id, method, params});
    }

    /**
     * @return {JsonRpcPipeline}
     */
    createPipeline() {
        const that = this;
        const idGenerator = async () => that.idGenerator();
        return new JsonRpcPipeline(idGenerator, this.handler, this.socket);
    }
}