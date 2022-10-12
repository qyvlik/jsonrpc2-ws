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

test('test client call with empty array', async () => {
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