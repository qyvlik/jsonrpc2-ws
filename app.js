import JsonRpc from './lib/jsonrpc/JsonRpc.js'

const onConnectionHandle = (websocket, request) => {
    websocket.ctx = {
        authorized: false,
        times: 0,
        time: Date.now()
    }
    return true;
};

const onMessagePreviousHandle = (websocket, data, isBinary) => {
    websocket.ctx.times++;
    if (!websocket.ctx.authorized) {
        websocket.send(JSON.stringify({jsonrpc, id, error: {code: 500, message: 'authorized failure'}}));
        return false;
    }
    return true;
};
const onMessagePostHandle = (websocket, data, isBinary, result) => {
};

const server = await JsonRpc.createServer(8080,
    {onConnectionHandle, onMessagePreviousHandle, onMessagePostHandle}
);

server.addMethod('ping', (params, session) => {
    return Date.now();
}, 1);

server.addMethod("auth", async (params, session) => {
    const {token} = params;
    if (token) {
        session.state['authorized'] = true;
        return true;
    }
    return false;
});
