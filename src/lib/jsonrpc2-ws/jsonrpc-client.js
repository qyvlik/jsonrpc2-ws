import WebSocket from "ws";
import JsonRpcMethod from "./jsonrpc-method.js";
import MessageProcessor from "./jsonrpc-message-processor.js";
import {sendRequest} from "./jsonrpc-send-message.js";

export default class JsonrpcClient {
    constructor(address, protocols, options) {
        /**
         *
         * @type {WebSocket}
         */
        this.ws = new WebSocket(address, protocols, options);
        this.id = 0;
        this.methods = new Map();
        this.callbacks = new Map();
        this.processor = new MessageProcessor(this.methods, this.callbacks);
        const that = this;
        this.ws.on('message', async (data, isBinary) => {
            await that.processor.onMessage(that.ws, data, isBinary);
        });
        this.ws.on('close', async () => {
            that.callbacks.clear();
        });
    }

    /**
     *
     * @param name      {string}    method name
     * @param method    {function}  method instance
     * @param concurrency   {number}
     */
    addMethod(name, method, concurrency = 0) {
        this.methods.set(name, new JsonRpcMethod(method, concurrency));
    }

    async request(method, params) {
        const id = ++this.id;
        await sendRequest(this.ws, {id, method, params}, this.callbacks);
    }

}

