import JsonRpcWS from "../lib/jsonrpc-ws/JsonRpcWS.js";
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";
import JsonRpcOnConnectionInterceptor from "../lib/jsonrpc-ws/interceptors/JsonRpcOnConnectionInterceptor.js";
import JsonRpcOnMessageInterceptor from "../lib/jsonrpc-ws/interceptors/JsonRpcOnMessageInterceptor.js";
import JsonRpcOnRequestInterceptor from "../lib/jsonrpc-ws/interceptors/JsonRpcOnRequestInterceptor.js";
import {JSON_RPC_ERROR_METHOD_INVALID_PARAMS, jsonrpc} from "../lib/jsonrpc-ws/JsonRpcConst.js";

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(1);
});

const server = new JsonRpc({role: 'server'});

async function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

const AUTH_TOKEN = '6d2d791b-98ca-4d45-ad02-1ff04c0bb112';

server.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor(async (websocket, request) => {
    // alloc resource
    const url = new URL(request.url, `http://${request.headers.host}`);

    const token = url.searchParams.get('token');
    if (token !== AUTH_TOKEN) {
        return false;
    }

    websocket.ctx = {
        authorized: true,
        times: 0,
        time: Date.now()
    }
    return true;
});

server.onMessageInterceptor = new JsonRpcOnMessageInterceptor(async (websocket, data, isBinary) => {
    websocket.ctx.times++;

    if (!websocket.ctx.authorized) {
        websocket.send(JSON.stringify({jsonrpc, error: {code: 401, message: 'authorized failure'}}));
        return false;
    }
    return true;
});

server.addMethod('ping', (params, websocket) => {
    return Date.now();
}, 1);

await JsonRpcWS.startupServer(server, 8080);
