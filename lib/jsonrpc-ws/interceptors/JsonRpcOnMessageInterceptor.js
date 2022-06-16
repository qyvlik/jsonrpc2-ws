

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
        try {
            return typeof this.previousHandle === 'function' ? await this.previousHandle(websocket, data, isBinary) : true;
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor previous error: `, error);
            return false;
        }
    }

    async post(websocket, data, isBinary, response) {
        try {
            if (typeof this.postHandle === 'function') {
                await this.postHandle(websocket, data, isBinary, response)
            }
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor post error: `, error);
        }
    }
};
