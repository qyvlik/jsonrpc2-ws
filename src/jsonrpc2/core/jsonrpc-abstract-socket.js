import {EventEmitter} from "events";

export default class JsonRpcAbstractSocket extends EventEmitter {
    constructor() {
        super();
    }

    /**
     *
     * @param message                  {string}
     * @param cb                       {Function|undefined}
     * @return {Promise<void>}
     */
    async send(message, cb) {
        return undefined;
    }

    /**
     *
     * @return {Promise<object>}
     */
    async getContext() {
        return {};
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    async isOpen() {
        return true;
    }
}