import WebSocket from "ws";
import {EventEmitter} from 'events';

export default class WebSocketMocker extends EventEmitter {
    constructor() {
        super();
        this.readyState = WebSocket.OPEN;
        this.buffer = [];
    }

    /**
     *
     * @param data          {string|ArrayBuffer}
     * @param isBinary      {boolean}
     */
    triggerMessageEvent(data, isBinary) {
        this.emit('message', data, isBinary);
    }

    send(data, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        this.buffer.push(data);
        cb();
    }
}