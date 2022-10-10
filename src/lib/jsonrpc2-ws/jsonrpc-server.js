import WebSocket, {WebSocketServer} from "ws";
import JsonRpcMethod from "./jsonrpc-method.js";
import MessageProcessor from "./jsonrpc-message-processor.js";

import {sendRequest} from "./jsonrpc-send-message.js";

export default class JsonrpcServer {
    constructor(options, callback) {
        this.wss = new WebSocketServer(options, callback);
        this.methods = new Map();
        this.callbacks = new Map();
        this.processor = new MessageProcessor(this.methods, this.callbacks);
        const that = this;
        this.wss.on('connection', async (websocket, request) => {
            websocket.on('message', async (data, isBinary) => {
                await that.processor.onMessage(websocket, data, isBinary);
            });
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

    /**
     * @param websocket
     * @param method
     * @param params
     * @return {Promise<void>}
     */
    async notification(websocket, {method, params}) {
        await sendRequest(websocket, {method, params});
    }
}

