import JsonRpcAbstractSocket from "../core/jsonrpc-abstract-socket.js";
import WebSocket from "ws";


export default class JsonRpcWsSocket extends JsonRpcAbstractSocket {
    /**
     * @param ws            {WebSocket}
     */
    constructor(ws) {
        super();
        this.ws = ws;
        const that = this;
        this.ws.on('open', () => that.emit('open'));
        this.ws.on('error', () => that.emit('error'));
        this.ws.on('close', () => that.emit('close'));
        this.ws.on('message', (data, isBinary) => that.emit('message', data, isBinary));
    }

    /**
     *
     * @param message                  {string}
     * @param cb                       {Function|undefined}
     * @return {Promise<void>}
     */
    async send(message, cb) {
        this.ws.send(message, cb);
    }

    /**
     * @param key       {string}
     * @return {Promise<object>}
     */
    async getContext(key) {
        if (!('ctx' in this.ws)) {
            this.ws.ctx = new Map();
        }
        return this.ws.ctx.get(key);
    }


    /**
     * @param key       {string}
     * @param value     {any}
     * @return {Promise<object>}
     */
    async setContext(key, value) {
        if (!'ctx' in this.ws) {
            this.ws.ctx = new Map();
        }
        this.ws.ctx.set(key, value);
    }

    /**
     * @param key       {string}
     * @return {Promise<Void>}
     */
    async deleteContext(key) {
        if ('ctx' in this.ws) {
            this.ws.ctx.delete(key);
        }
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    async isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }

}