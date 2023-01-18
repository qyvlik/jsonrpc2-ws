

export default class JsonRpcError {
    /**
     *
     * @param code                      {number}
     * @param message                   {string}
     * @param data                      {any}
     */
    constructor(code, message, data) {
        this.message = message;
        this.code = code;
        this.data = data;
    }
}