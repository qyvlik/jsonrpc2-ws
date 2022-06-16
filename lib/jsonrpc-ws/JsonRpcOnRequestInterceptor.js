/**
 *
 */
export default class JsonRpcOnRequestInterceptor {
    constructor(previousHandle, postHandle) {
        this.type = 'JsonRpcOnRequestInterceptor';
        this.previousHandle = previousHandle;
        this.postHandle = postHandle;
    }

    setPreviousHandle(previousHandle) {
        this.previousHandle = previousHandle;
    }

    setPostHandle(postHandle) {
        this.postHandle = postHandle;
    }

    /**
     * return false will close websocket
     * @param id
     * @param method
     * @param params
     * @param websocket
     * @returns {Promise<*|boolean>}
     */
    async previous({id, method, params}, websocket) {
        try {
            return typeof this.previousHandle === 'function' ? await this.previousHandle({id, method, params}, websocket) : true;
        } catch (error) {
            console.error(`JsonRpcOnRequestInterceptor previous error: `, error);
            return false;
        }
    }

    /**
     * @class JsonRpcOnRequestInterceptor.close return true will invoke
     * @param id
     * @param method
     * @param params
     * @param websocket
     * @param result
     * @returns {Promise<void>}
     */
    async post({id, method, params}, websocket, result) {
        try {
            if (typeof this.postHandle === 'function') {
                await this.postHandle({id, method, params}, websocket, result)
            }
        } catch (error) {
            console.error(`JsonRpcOnRequestInterceptor post error: `, error);
        }
    }
};
