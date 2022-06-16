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
        const {previousHandle} = this;
        try {
            return typeof previousHandle === 'function' ? await previousHandle({id, method, params}, websocket) : true;
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
     * @param response
     * @returns {Promise<void>}
     */
    async post({id, method, params}, websocket, response) {
        const {postHandle} = this;
        try {
            if (typeof postHandle === 'function') {
                await postHandle({id, method, params}, websocket, response)
            }
        } catch (error) {
            console.error(`JsonRpcOnRequestInterceptor post error: `, error);
        }
    }
};
