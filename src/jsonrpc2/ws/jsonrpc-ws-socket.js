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
     *
     * @return {Promise<object>}
     */
    async getContext()  {
        if (!'ctx' in this.ws) {
            this.ws.ctx = {};
        }
        return this.ws.ctx;
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    async isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }

}