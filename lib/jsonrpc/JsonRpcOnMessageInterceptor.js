import JsonRpcOnConnectionInterceptor from "./JsonRpcOnConnectionInterceptor";

/**
 *
 */
export default class JsonRpcOnMessageInterceptor {
    constructor(previousHandle, postHandle) {
        this.type = 'JsonRpcOnMessageInterceptor';
        this.previousHandle = previousHandle;
        this.postHandle = postHandle;
    }

    setPreviousHandle(previousHandle) {
        this.previousHandle = previousHandle;
    }

    setPostHandle(postHandle) {
        this.postHandle = postHandle;
    }

    async previous(websocket, data, isBinary) {
        const {previousHandle} = this;
        try {
            return typeof previousHandle === 'function' ? await previousHandle(websocket, data, isBinary) : true;
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor previous error: `, error);
            return false;
        }
    }

    async post(websocket, data, isBinary, result) {
        const {postHandle} = this;
        try {
            if (typeof postHandle === 'function') {
                await postHandle(websocket, data, isBinary, result)
            }
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor post error: `, error);
        }
    }
};
