import PQueue from "p-queue";

/**
 * JSON RPC Method
 */
export default class JsonRpcMethod {
    /**
     *
     * @param method        {function}
     * @param concurrency   {number|undefined}
     */
    constructor(method, concurrency = 0) {
        const limit = typeof concurrency !== 'undefined' && Number.isInteger(concurrency) && concurrency > 0;
        this.method = method;
        this.queue = limit ? new PQueue({concurrency}) : null;
    }

    /**
     *
     * @param params
     * @param websocket
     * @return {Promise<*>}
     */
    async invoke(params, websocket) {
        const {method} = this;
        if (this.queue !== null) {
            return await this.queue.add(async () => await method(params, websocket));
        }
        return await method(params, websocket);
    }
}