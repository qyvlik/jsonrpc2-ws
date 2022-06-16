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

    async previous({id, method, params}, websocket) {
        const {previousHandle} = this;
        try {
            return typeof previousHandle === 'function' ? await previousHandle({id, method, params}, websocket) : true;
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor previous error: `, error);
            return false;
        }
    }

    async post({id, method, params}, websocket, result) {
        const {postHandle} = this;
        try {
            if (typeof postHandle === 'function') {
                await postHandle({id, method, params}, websocket, result)
            }
        } catch (error) {
            console.error(`JsonRpcOnMessageInterceptor post error: `, error);
        }
    }
};
