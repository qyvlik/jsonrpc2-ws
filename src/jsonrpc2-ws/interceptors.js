/**
 *
 * @callback JsonRpcMessagePreHandle
 * @param {string|blob}     data
 * @param {boolean}         isBinary
 * @param {WebSocket}       websocket
 * @return boolean
 */

export class JsonRpcMessageInterceptor {
    /**
     * @param preHandle     {JsonRpcMessagePreHandle}
     */
    constructor(preHandle) {
        this.preHandle = preHandle;
    }

    /**
     * @param {string|blob}     data
     * @param {boolean}         isBinary
     * @param {WebSocket}       websocket
     * @return boolean
     */
    async pre(data, isBinary, websocket) {
        if (typeof this.preHandle != 'function') {
            return true;
        }
        return this.preHandle(data, isBinary, websocket);
    }
}

/**
 *
 * @callback JsonRpcRequestPreHandle
 * @param request           {method: string, id: (string | number), params: (Object|Array)}
 * @param websocket         {WebSocket}
 * @return boolean|{id, jsonrpc: string, error: {code: number, message: string}, result: (null|*)}
 */

/**
 *
 * @callback JsonRpcRequestPostHandle
 * @param response          {id, jsonrpc: string, error: {code: number, message: string}, result: (null|*)}
 * @param websocket         {WebSocket}
 * @return void
 */

export class JsonRpcRequestInterceptor {
    /**
     * @param preHandle     {JsonRpcRequestPreHandle}
     * @param postHandle    {JsonRpcRequestPostHandle}
     */
    constructor(preHandle, postHandle) {
        this.preHandle = preHandle;
        this.postHandle = postHandle;
    }

    /**
     * @param id                {string|number}
     * @param method            {string}
     * @param params            {object|array}
     * @param websocket         {WebSocket}
     * @return {Promise<undefined|{id, jsonrpc: string, error: {code: number, message: string}, result: (null|*)}>}
     */
    async pre({id, method, params}, websocket) {
        if (typeof this.preHandle !== 'function') {
            return;
        }
        return this.preHandle({id, method, params}, websocket);
    }

    /**
     *
     * @param response          {id, jsonrpc: string, error: {code: number, message: string}, result: (null|*)}
     * @param websocket         {WebSocket}
     * @return {Promise<void>}
     */
    async post(response, websocket) {
        if (typeof this.postHandle !== 'function') {
            return;
        }
        await this.postHandle(response, websocket);
    }
}