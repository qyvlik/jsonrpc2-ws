import JsonRpcWS from "../lib/jsonrpc-ws/JsonRpcWS.js";
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";
import JsonRpcOnConnectionInterceptor from "../lib/jsonrpc-ws/interceptors/JsonRpcOnConnectionInterceptor.js";
import JsonRpcOnRequestInterceptor from "../lib/jsonrpc-ws/interceptors/JsonRpcOnRequestInterceptor.js";
import {jsonrpc} from "../lib/jsonrpc-ws/JsonRpcConst.js";

const server = new JsonRpc({role: 'server'});

async function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

const AUTH_TOKEN = '6d2d791b-98ca-4d45-ad02-1ff04c0bb112';

server.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor(async (websocket, request) => {
    websocket.ctx = {
        authorized: false,
        times: 0,
        time: Date.now()
    }
    return true;
});

server.onRequestInterceptor = new JsonRpcOnRequestInterceptor(async ({id, method, params}, websocket) => {
    if (!websocket.ctx.authorized && method === 'auth') {
        return true;
    }
    if (!websocket.ctx.authorized) {

        websocket.send(JSON.stringify({id, jsonrpc, error: {code: 401, message: ''}}))

        return false;
    }
    return true;
});

server.addMethod('auth', (params, websocket) => {
    const {token} = params;
    if (token !== AUTH_TOKEN) {
        return false;
    }
    websocket.ctx.authorized = true;
    return true;
}, 1);

server.addMethod('ping', (params, websocket) => {
    return Date.now();
}, 1);

await JsonRpcWS.startupServer(server, 8080);
