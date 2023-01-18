import WebSocket from "ws";
import {
    JsonRpcWsServer,
    JsonRpcWsClient,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
} from "../src/main.js"
import getPort from "get-port";


async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonRpcWsServer({port}, async () => {
                console.info(`server listen ${port}`);
                resolve(server);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function startupClient(url) {
    return new Promise((resolve, reject) => {
        try {
            const client = new JsonRpcWsClient(url);
            client.on('open', () => {
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

let server = null;
const port = await getPort();

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

test('test server method', () => {
    expect(server).not.toBe(null);

    const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const echo = (params) => params;
    const error = (params) => {
        throw new Error(`${params[0]}`)
    };
    const time = () => Date.now();
    let count = 0;
    const counter = () => ++count;

    server.setMethod('echo', echo);
    server.setMethod('sleep', sleep);
    server.setMethod('error', error);
    server.setMethod('time', time);
    server.setMethod('counter', counter);

    try {
        server.setMethod('null', null);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.setMethod('undefined', undefined);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.setMethod('1', 1);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.setMethod('string', `string`);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }

    expect(server.handler.methods.has('echo')).toBe(true);
    expect(server.handler.methods.has('sleep')).toBe(true);
    expect(server.handler.methods.has('error')).toBe(true);
    expect(server.handler.methods.has('time')).toBe(true);
    expect(server.handler.methods.has('counter')).toBe(true);
    expect(server.handler.methods.size).toBe(5);
    expect(server.handler.methods.has('method_not_found')).toBe(false);
});

const clients = new Set();

test('test client call server method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    {
        const sleepMs = 1000;
        const gap = 50;
        const start = Date.now();
        const result = await client.request('sleep', [sleepMs]);
        const end = Date.now();
        const cost = (end - start);
        expect(result).toBeNull();
        expect(Math.abs(cost - sleepMs)).toBeLessThan(gap);
    }

    {
        const gap = 50;
        const start = Date.now();
        const result = await client.request('time', []);
        const realGap = (result - start);
        expect(realGap).toBeLessThan(gap);
    }
});

test('test client invalid params', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    try {
        await client.request('lost_params');
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_NOT_FOUND);
        expect(message).toBe('Method not found');
    }

    try {
        await client.request('params_is_string', '');
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }

    try {
        await client.request('params_is_number', 111);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }

    try {
        await client.request('params_is_number', 111.1);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }
});

test('test client call not exist method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    try {
        await client.request('method_not_found', []);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_NOT_FOUND);
        expect(message).toBe('Method not found');
    }
});

test('test client call error', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const error_string = Date.now() + '';
    try {
        await client.request('error', [error_string]);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message, data} = error;
        expect(code).toBe(JSON_RPC_ERROR);
        expect(message).toBe('Server error');
        expect(data.message).toBe(error_string);
    }
});

test('test client notification server', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const result1 = await client.request('counter');
    expect(result1).toBe(1);

    await client.notification('counter');
    await client.notification('counter');
    await client.notification('counter');

    const result2 = await client.request('counter');
    expect(result2).toBe(5);
});

afterAll(async () => {
    for (const client of clients) {
        client.ws.close();
    }
    return new Promise((resolve, reject) => {
        if (server != null) {
            server.wss.close(resolve);
        } else {
            resolve();
        }
    });
});