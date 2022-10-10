import WebSocket, {WebSocketServer} from "ws";
import JsonRpcMethod from "./jsonrpc-method.js";
import MessageProcessor from "./jsonrpc-message-processor.js";

import {sendRequest} from "./jsonrpc-send-message.js";

export default class JsonrpcServer {
    /**
     * Create a `WebSocketServer` instance.
     *
     * @param {Object} options Configuration options
     * @param {Number} [options.backlog=511] The maximum length of the queue of
     *     pending connections
     * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
     *     track clients
     * @param {Function} [options.handleProtocols] A hook to handle protocols
     * @param {String} [options.host] The hostname where to bind the server
     * @param {Number} [options.maxPayload=104857600] The maximum allowed message
     *     size
     * @param {Boolean} [options.noServer=false] Enable no server mode
     * @param {String} [options.path] Accept only connections matching this path
     * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
     *     permessage-deflate
     * @param {Number} [options.port] The port where to bind the server
     * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
     *     server to use
     * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
     *     not to skip UTF-8 validation for text and close messages
     * @param {Function} [options.verifyClient] A hook to reject connections
     * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
     *     class to use. It must be the `WebSocket` class or class that extends it
     * @param {Function} [callback] A listener for the `listening` event
     */
    constructor(options, callback) {
        this.wss = new WebSocketServer(options, callback);
        this.methods = new Map();
        this.callbacks = new Map();
        this.processor = new MessageProcessor(this.methods, this.callbacks, 'server');
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

