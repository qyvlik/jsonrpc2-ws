/**
 *
 */
export default class JsonRpcOnConnectionInterceptor {
    constructor(handle) {
        this.type = 'JsonRpcOnConnectionInterceptor';
        this.handle = handle;
    }

    setHandle(handle) {
        this.handle = handle;
    }

    /**
     *
     * @param websocket
     * @param request   {http.IncomingMessage}
     * @returns {Promise<*|boolean>}
     */
    async previous(websocket, request) {
        try {
            return typeof this.handle === 'function' ? await this.handle(websocket, request) : true;
        } catch (error) {
            console.error(`JsonRpcOnConnectionInterceptor previous error: `, error);
            return false;
        }
    }
};