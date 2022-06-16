import JsonRpcWS from "./lib/jsonrpc-ws/JsonRpcWS.js";
import JsonRpc from "./lib/jsonrpc-ws/JsonRpc.js";
import JsonRpcOnConnectionInterceptor from "./lib/jsonrpc-ws/JsonRpcOnConnectionInterceptor.js";
import JsonRpcOnMessageInterceptor from "./lib/jsonrpc-ws/JsonRpcOnMessageInterceptor.js";
import JsonRpcOnRequestInterceptor from "./lib/jsonrpc-ws/JsonRpcOnRequestInterceptor.js";
import {jsonrpc} from "./lib/jsonrpc-ws/JsonRpcConst.js";

const server = new JsonRpc({role: 'server'});

server.onConnectionInterceptor = new JsonRpcOnConnectionInterceptor(async (websocket, request) => {
    websocket.ctx = {
        authorized: false,
        times: 0,
        time: Date.now()
    }
    return true;
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
}, async ({id, method, params}, websocket, response) => {
})

server.addMethod('ping', (params, websocket) => {
    return Date.now();
}, 1);

server.addMethod("auth", async (params, websocket) => {
    const {token} = params;
    if (token) {
        websocket.state['authorized'] = true;
        return true;
    }
    return false;
});

await JsonRpcWS.startupServer(server, 8080);
