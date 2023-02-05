import JsonRpcAbstractSocket from "../core/jsonrpc-abstract-socket.js";
import WebSocket from "ws";


export default class JsonRpcWsSocket extends JsonRpcAbstractSocket {
    /**
     * @param ws            {WebSocket}
     * @param role          {string}
     * @param verbose       {boolean}
     */
    constructor(ws, role, verbose) {
        super(role, verbose);
        this.ws = ws;
    }

    /**
     *
     * @param message                  {string}
     * @param cb                       {Function|undefined}
     * @return {Promise<void>}
     */
    async send(message, cb) {
        this.ws.send(message, cb);
        if (this.verbose) {
            console.debug(`${this.role === 'client' ? '-->' : `<--`} ${message}`);
        }
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
     * @return {Promise<void>}
     */
    async setContext(key, value) {
        if (!('ctx' in this.ws)) {
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
     * @return {boolean}
     */
    isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }

}