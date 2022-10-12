import WebSocket from "ws";
import {
    JsonRpcServer,
    JsonRpcClient,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_NOT_FOUND, JSON_RPC_ERROR_PARSE_ERROR, JSON_RPC_ERROR_INVALID_REQUEST,
} from "../src/main.js"

async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonRpcServer({port}, async () => {
                resolve(server);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function startupWebSocket(url) {
    return new Promise((resolve, reject) => {
        try {
            const webSocket = new WebSocket(url);
            webSocket.on('open', () => {
                resolve(webSocket);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 *
 * @param webSocket
 * @param text
 * @return {Promise<string>}
 */
async function webSocketSendTextAndWaitReturn(webSocket, text) {
    return new Promise((resolve, reject) => {
        webSocket.once('message', (data) => {
            resolve(data);
        });
        webSocket.once('close', (code) => {
            reject(code);
        })
        webSocket.send(text);
    });
}

let server = null;
const port = 8083;

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

test('test server method', () => {
    expect(server).not.toBe(null);

    const echo = (params) => params;
    server.addMethod('echo', echo);

    expect(server.methods.has('echo')).toBe(true);
    expect(server.methods.size).toBe(1);
});

const webSockets = new Set();

test('test client call with blank string', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '');

    const resp = JSON.parse(responseText);
    expect('error' in resp).toBe(true);
    expect('id' in resp).toBe(true);
    const {id, error} = resp;
    expect(id).toBeNull();
    expect('code' in error).toBe(true);
    expect('message' in error).toBe(true);
    const {code, message} = error;

    expect(code).toBe(JSON_RPC_ERROR_PARSE_ERROR);
    expect(message).toBe('Parse error');
});

test('test client call with []', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '[]');

    const resp = JSON.parse(responseText);
    expect('error' in resp).toBe(true);
    expect('id' in resp).toBe(true);
    const {id, error} = resp;
    expect(id).toBeNull();
    expect('code' in error).toBe(true);
    expect('message' in error).toBe(true);
    const {code, message} = error;

    expect(code).toBe(JSON_RPC_ERROR_INVALID_REQUEST);
    expect(message).toBe('Invalid Request');
});

test('test client call with [1]', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '[1]');

    const array = JSON.parse(responseText);
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(1);
    const [resp] = array;

    expect('error' in resp).toBe(true);
    expect('id' in resp).toBe(true);
    const {id, error} = resp;
    expect(id).toBeNull();
    expect('code' in error).toBe(true);
    expect('message' in error).toBe(true);
    const {code, message} = error;

    expect(code).toBe(JSON_RPC_ERROR_INVALID_REQUEST);
    expect(message).toBe('Invalid Request');
});

test('test client call with [1,2,3]', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '[1,2,3]');

    const array = JSON.parse(responseText);
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(3);

    for (const resp of array) {
        expect('error' in resp).toBe(true);
        expect('id' in resp).toBe(true);
        const {id, error} = resp;
        expect(id).toBeNull();
        expect('code' in error).toBe(true);
        expect('message' in error).toBe(true);
        const {code, message} = error;

        expect(code).toBe(JSON_RPC_ERROR_INVALID_REQUEST);
        expect(message).toBe('Invalid Request');
    }
});

test('test client call with {}', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '{}');

    const resp = JSON.parse(responseText);
    expect('error' in resp).toBe(true);
    expect('id' in resp).toBe(true);
    const {id, error} = resp;
    expect(id).toBeNull();
    expect('code' in error).toBe(true);
    expect('message' in error).toBe(true);
    const {code, message} = error;

    expect(code).toBe(JSON_RPC_ERROR_INVALID_REQUEST);
    expect(message).toBe('Invalid Request');
});

test('test client call with {"foo":"bar"}', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);
    const responseText = await webSocketSendTextAndWaitReturn(webSocket, '{"foo":"bar"}');

    const resp = JSON.parse(responseText);
    expect('error' in resp).toBe(true);
    expect('id' in resp).toBe(true);
    const {id, error} = resp;
    expect(id).toBeNull();
    expect('code' in error).toBe(true);
    expect('message' in error).toBe(true);
    const {code, message} = error;

    expect(code).toBe(JSON_RPC_ERROR_INVALID_REQUEST);
    expect(message).toBe('Invalid Request');
});

test('test client rpc batch call', async () => {
    const webSocket = await startupWebSocket(`ws://localhost:${port}`);
    expect(webSocket).not.toBe(null);
    expect(webSocket.readyState).toBe(WebSocket.OPEN);

    webSockets.add(webSocket);

    const req = [
        {"jsonrpc": "2.0", "method": "echo", "params": ['hello_world'], "id": "1"},
        {"jsonrpc": "2.0", "method": "echo", "params": ['not_echo']},
        {"foo": "boo"},
        {"jsonrpc": "2.0", "method": "not_found", "params": {"name": "myself"}, "id": "5"}
    ];

    const responseText = await webSocketSendTextAndWaitReturn(webSocket, JSON.stringify(req));

    const array = JSON.parse(responseText);
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(3);
    const [id1, idnull, id5] = array;

    expect(id1).toEqual({"id":"1","jsonrpc":"2.0","result":["hello_world"]});
    expect(idnull).toEqual({"id":null,"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request","data":"Neither request nor response"}});
    expect(id5).toEqual({"id":"5","jsonrpc":"2.0","error":{"code":-32601,"message":"Method not found"}});
});

afterAll(async () => {
    for (const client of webSockets) {
        client.close();
    }
    return new Promise((resolve, reject) => {
        if (server != null) {
            server.wss.close(resolve);
        } else {
            resolve();
        }
    });
});