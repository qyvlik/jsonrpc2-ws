/**
 *
 */
export default class JsonRpcOnConnectionInterceptor {
    constructor(openHandle, closeHandle) {
        this.type = 'JsonRpcOnConnectionInterceptor';
        this.openHandle = openHandle;
        this.closeHandle = closeHandle;
    }

    setOpenHandle(openHandle) {
        this.openHandle = openHandle;
    }

    setCloseHandle(closeHandle) {
        this.closeHandle = closeHandle;
    }

    /**
     *
     * @param websocket
     * @param request   {http.IncomingMessage}
     * @returns {Promise<*|boolean>}
     */
    async open(websocket, request) {
        try {
            return typeof this.openHandle === 'function' ? await this.openHandle(websocket, request) : true;
        } catch (error) {
            console.error(`JsonRpcOnConnectionInterceptor open error: `, error);
            return false;
        }
    }

    /**
     *
     * @param websocket
     * @returns {Promise<*|boolean>}
     */
    async close(websocket) {
        try {
            return typeof this.closeHandle === 'function' ? await this.closeHandle(websocket) : true;
        } catch (error) {
            console.error(`JsonRpcOnConnectionInterceptor close error: `, error);
            return false;
        }
    }
};