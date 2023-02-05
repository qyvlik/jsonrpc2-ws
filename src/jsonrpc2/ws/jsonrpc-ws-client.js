import {EventEmitter} from "events";
import WebSocket from "ws";

import JsonRpcWsSocket from "./jsonrpc-ws-socket.js";
import JsonRpcMessageHandler from "../core/jsonrpc-message-handler.js";
import {paramsIsValidate} from "../core/utils.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "../core/jsonrpc-constant.js";
import JsonRpcPipeline from "../core/jsonrpc-pipeline.js";

export default class JsonRpcWsClient extends EventEmitter {
    /**
     * Create a `JsonRpcWsClient` instance.
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
        this.handler = new JsonRpcMessageHandler(`client`, false);
        this.socket = new JsonRpcWsSocket(this.ws, `client`, false);
        this.ws.on('open', () => this.emit('open'));
        this.ws.on('close', () => this.emit('close'));
        this.ws.on('error', () => this.emit('error'));
        this.ws.on('message', async (data, isBinary) => {
            await this.handler.onMessage(this.socket, data, isBinary);
        });
    }

    /**
     * Create a `JsonRpcWsClient` instance and await it connected
     * @param {(String|URL)} address The URL to which to connect
     * @param {(String|String[])} [protocols] The subprotocols
     * @param {Object} [options] Connection options
     */
    static connect(address, protocols, options) {
        return new Promise((resolve, reject)=>{
            try {
                const jsonRpcWsClient = new JsonRpcWsClient(address, protocols, options);
                jsonRpcWsClient.ws.once('open', ()=>{
                    resolve(jsonRpcWsClient);
                });
                jsonRpcWsClient.ws.once('error', (error)=>{
                    reject(error)
                });
                jsonRpcWsClient.ws.once('unexpected-response', (req, res)=>{
                    reject({req, res});
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @param name      {string}    method name
     * @param method    {function}  method instance
     */
    setMethod(name, method) {
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