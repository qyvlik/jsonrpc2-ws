import {EventEmitter} from "events";

export default class JsonRpcAbstractSocket extends EventEmitter {
    /**
     * @param role              {string}
     * @param verbose           {boolean}
     */
    constructor(role, verbose) {
        super();
        this.role = role;
        this.verbose = verbose;
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
     * @param key           {string}
     * @return {Promise<any>}
     */
    async getContext(key) {
        return {};
    }

    /**
     * @param key       {string}
     * @param value     {any}
     * @return {Promise<object>}
     */
    async setContext(key, value) {
        return {};
    }

    /**
     * @param key       {string}
     * @return {Promise<Void>}
     */
    async deleteContext(key) {

    }

    /**
     *
     * @return {boolean}
     */
    isOpen() {
        return false;
    }
}