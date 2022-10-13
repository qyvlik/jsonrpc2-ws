import WebSocket from "ws";
import {EventEmitter} from 'events';
import MessageProcessor from "./message-processor.js";

export default class JsonRpcClient extends EventEmitter {

    /**
     * Create a `JsonRpcClient` instance.
     * @param {(String|URL)} address The URL to which to connect
     * @param {(String|String[])} [protocols] The subprotocols
     * @param {Object} [options] Connection options
     */
    constructor(address, protocols, options) {
        super();
        this.id = 0;
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
     * @param method
     * @param params
     * @return {Promise<object>}
     */
    async notification(method, params) {
        return await this.processor.sendRequest(this.ws, {method, params});
    }

    async request(method, params) {
        const id = ++this.id;
        return await this.processor.sendRequest(this.ws, {id, method, params}, this.callbacks);
    }
}
