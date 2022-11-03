import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "./constant.js";
import {paramsIsValidate} from "./utils.js";

/**
 * https://www.jsonrpc.org/specification#batch
 */
export default class JsonRpcPipeline {
    /**
     *
     * @param jsonRpc           {JsonRpcClient|JsonRpcServer}
     * @param websocket         {WebSocket}
     */
    constructor(jsonRpc, websocket) {
        this.requests = [];
        this.running = false;
        this.jsonRpc = jsonRpc;
        this.websocket = websocket;
        this.needResponseCount = 0;
    }

    /**
     *
     * @param method            {string}
     * @param params            {object|array|undefined}
     * @return {Promise<number|string>}
     */
    async request(method, params= undefined) {
        if (this.running) {
            throw new Error(`pipeline is running, you can't add request`);
        }
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        const id = await this.jsonRpc.idGenerator();
        this.requests.push({jsonrpc, id, method, params});
        this.needResponseCount++;
        return id;
    }

    notification(method, params) {
        if (this.running) {
            throw new Error(`pipeline is running, you can't add request`);
        }
        if (!paramsIsValidate(params)) {
            throw {jsonrpc, code: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: 'Invalid params'};
        }
        this.requests.push({jsonrpc, method, params});
    }

    /**
     *
     * @return {Promise<array>}
     */
    async execute() {
        if (this.running) {
            throw new Error(`pipeline is running, you can't execute again!`);
        }
        this.running = true;
        if (this.requests.length === 0) {
            throw new Error(`requests is empty`);
        }
        return await this.jsonRpc.processor.sendRequests(this.websocket, this.requests, this.needResponseCount);
    }
}
