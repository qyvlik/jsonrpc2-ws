import WebSocket from "ws";
import {EventEmitter} from 'events';
import MessageProcessor from "./message-processor.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "./core/constant.js";
import {paramsIsValidate} from "./utils.js";
import JsonRpcPipeline from "./pipeline.js";

export default class JsonRpcClient extends EventEmitter {

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
        this.methods = new Map();
        this.callbacks = new Map();
        this.processor = new MessageProcessor(this.methods, this.callbacks, 'client');

        /**
         *
         * @type {WebSocket}
         */
        this.ws = new WebSocket(address, protocols, options);
        const that = this;
        this.ws.on('open', () => that.emit('open'));
        this.ws.on('message', async (data, isBinary) => {
            await that.processor.onMessage(that.ws, data, isBinary);
        });
        this.ws.on('close', () => that.emit('close'));
    }

    /**
     *
     * @param name      {string}    method name
     * @param method    {function}  method instance
     */
    addMethod(name, method) {
        if (typeof method !== 'function') {
            throw new Error(`method not function`);
        }
        this.methods.set(name, method);
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
        return await this.processor.sendRequest(this.ws, {method, params});
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
        return await this.processor.sendRequest(this.ws, {id, method, params});
    }

    /**
     * @return {JsonRpcPipeline}
     */
    createPipeline() {
        return new JsonRpcPipeline(this, this.ws);
    }
}

