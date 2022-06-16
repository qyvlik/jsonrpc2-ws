import JsonRpcWS from "./lib/jsonrpc-ws/JsonRpcWS.js";
import JsonRpc from "./lib/jsonrpc-ws/JsonRpc.js";
import JsonRpcOnConnectionInterceptor from "./lib/jsonrpc-ws/interceptors/JsonRpcOnConnectionInterceptor.js";
import JsonRpcOnMessageInterceptor from "./lib/jsonrpc-ws/interceptors/JsonRpcOnMessageInterceptor.js";
import JsonRpcOnRequestInterceptor from "./lib/jsonrpc-ws/interceptors/JsonRpcOnRequestInterceptor.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "./lib/jsonrpc-ws/JsonRpcConst.js";

const server = new JsonRpc({role: 'server'});

async function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

server.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor(async (websocket, request) => {
    // alloc resource
    websocket.ctx = {
        authorized: false,
        times: 0,
        time: Date.now(),
        timer: null
    }
    return true;
}, async (websocket) => {
    // free resource
    clearInterval(websocket.ctx.timer);
});

server.onMessageInterceptor = new JsonRpcOnMessageInterceptor(async (websocket, data, isBinary) => {
    websocket.ctx.times++;
    // if (!websocket.ctx.authorized) {
    //     websocket.send(JSON.stringify({jsonrpc, error: {code: 500, message: 'authorized failure'}}));
    //     return false;
    // }
    return true;
}, async (websocket, data, isBinary, response) => {
});

server.onRequestInterceptor = new JsonRpcOnRequestInterceptor(async ({id, method, params}, websocket) => {
    return true;
}, async ({id, method, params}, websocket, result) => {
})

server.addMethod('ping', (params, websocket) => {
    return Date.now();
}, 1);

server.addMethod('sleep', async (params, websocket) => {
    const [ms] = params;
    await sleep(ms);
    return true;
}, 1);

server.addMethod('interval_echo', async (params, websocket) => {
    const {enable, timeout} = params;
    if (typeof enable === 'undefined' || enable === null) {
        throw {jsonrpc, error: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: "Invalid Params: enable"};
    }

    if (enable && (typeof timeout === 'undefined' || timeout === null || timeout < 1)) {
        throw {jsonrpc, error: JSON_RPC_ERROR_METHOD_INVALID_PARAMS, message: "Invalid Params: timeout"};
    }

    if (enable && websocket.ctx.timer == null) {
        websocket.ctx.timer = setInterval(async () => {
            try {
                await server.notification('heart', Date.now(), websocket);
            } catch (error) {
                console.error(`notification error`, error)
            }
        }, timeout);
        return true;
    }

    if (!enable) {
        clearInterval(websocket.ctx.timer);
        websocket.ctx.timer = null;
    }

    return true;
}, 1);

server.addMethod("auth", async (params, websocket) => {
    const {token} = params;
    if (token) {
        websocket.ctx.authorized = true;
        return true;
    }
    return false;
});

await JsonRpcWS.startupServer(server, 8080);
