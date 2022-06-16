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

    async previous(websocket, request) {
        const {handle} = this;
        try {
            return typeof handle === 'function' ? await handle(websocket, request) : true;
        } catch (error) {
            console.error(`JsonRpcOnConnectionInterceptor previous error: `, error);
            return false;
        }

    }
};