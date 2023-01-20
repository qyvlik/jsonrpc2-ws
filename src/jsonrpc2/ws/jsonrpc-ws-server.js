import {EventEmitter} from "events";
import {WebSocketServer} from "ws";

import JsonRpcWsSocket from "./jsonrpc-ws-socket.js";
import JsonRpcMessageHandler from "../core/jsonrpc-message-handler.js";
import {paramsIsValidate} from "../core/utils.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "../core/jsonrpc-constant.js";
import JsonRpcPipeline from "../core/jsonrpc-pipeline.js";



export default class JsonRpcWsServer extends EventEmitter {
    /**
     * Create a `JsonRpcWsServer` instance.
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
        super();
        let id = 0;
        this.idGenerator = () => id++;

        this.handler = new JsonRpcMessageHandler(`server`, false);
        this.wss = new WebSocketServer(options, callback);
        const that = this;
        this.wss.on('connection', async (websocket, request) => {
            const socket = that.getSocketFromWs(websocket, that.handler.role, that.handler.verbose);
            socket.on('message', async (data, isBinary) => {
                await that.handler.onMessage(socket, data, isBinary);
            });
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
     * @param websocket         {WebSocket}
     * @param method            {string}
     * @param params            {object|[]}
     * @return {Promise<object>}
     */
    async notification(websocket, method, params) {
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        const socket = that.getSocketFromWs(websocket, 'client', false);
        return await this.handler.sendRequest(socket, {method, params});
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
        const socket = that.getSocketFromWs(websocket, 'client', false);
        return await this.handler.sendRequest(socket, {id, method, params});
    }

    /**
     * @param websocket         {WebSocket}
     * @return {JsonRpcPipeline}
     */
    createPipeline(websocket) {
        const that = this;
        const idGenerator = async () => that.idGenerator();
        const socket = that.getSocketFromWs(websocket, 'client', false);
        return new JsonRpcPipeline(idGenerator, this.handler, socket);
    }

    /**
     *
     * @param websocket             {WebSocket}
     * @param role                  {string}
     * @param verbose               {boolean}
     * @return {JsonRpcWsSocket}
     */
    getSocketFromWs(websocket, role, verbose) {
        if (!('__JsonRpcAbstractSocket' in websocket)) {
            return websocket['__JsonRpcAbstractSocket'] = new JsonRpcWsSocket(websocket, role, verbose);
        }
        return websocket['__JsonRpcAbstractSocket'];
    }
}