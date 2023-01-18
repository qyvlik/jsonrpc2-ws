import WebSocket, {WebSocketServer} from "ws";
import MessageProcessor from "./message-processor.js";
import {paramsIsValidate} from "./utils.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "./core/constant.js";
import JsonRpcPipeline from "./pipeline.js";

export default class JsonRpcServer {
    /**
     * Create a `JsonRpcServer` instance.
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
        let id = 0;
        this.idGenerator = () => id++;
        this.methods = new Map();
        this.callbacks = new Map();
        this.processor = new MessageProcessor(this.methods, this.callbacks, 'server');

        this.wss = new WebSocketServer(options, callback);
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
     */
    addMethod(name, method) {
        if (typeof method !== 'function') {
            throw new Error(`method not function`);
        }
        this.methods.set(name, method);
    }

    /**
     * @param websocket         {WebSocket}
     * @param method            {string}
     * @param params            {object|[]}
     * @return {Promise<object>}
     */
    async notification(websocket, method, params) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        return await this.processor.sendRequest(websocket, {method, params});
    }

    /**
     * @param websocket         {WebSocket}
     * @param method            {string}
     * @param params            {object|[]}
     * @return {Promise<object>}
     */
    async request(websocket, method, params) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        const id = await this.idGenerator();
        return await this.processor.sendRequest(websocket, {id, method, params});
    }

    /**
     * @param websocket         {WebSocket}
     * @return {JsonRpcPipeline}
     */
    createPipeline(websocket) {
        return new JsonRpcPipeline(this, websocket);
    }
}

