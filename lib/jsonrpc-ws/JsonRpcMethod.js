import PQueue from "p-queue";

export default class JsonRpcMethod {
    constructor({func, concurrency}) {
        const limit = typeof concurrency !== 'undefined' && Number.isInteger(concurrency) && concurrency > 0;
        this.func = func;
        this.queue = limit ? new PQueue({concurrency}) : null;
    }

    async call(params, websocket) {
        const that = this;
        if (that.queue !== null) {
            return await that.queue.add(async () => await that.execute(params, websocket));
        }
        return await that.execute(params, websocket);
    }

    async execute(params, websocket) {
        const {func} = this;
        return await func(params, websocket);
    }
}