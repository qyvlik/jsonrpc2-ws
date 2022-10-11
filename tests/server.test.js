import WebSocket from "ws";
import {
    JsonRpcServer,
    JsonRpcClient,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
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

async function startupClient(url) {
    return new Promise((resolve, reject) => {
        try {
            const client = new JsonRpcClient(url);
            client.ws.on('open', () => {
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

let server = null;
const port = 8080;

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

    server.addMethod('echo', echo);
    server.addMethod('sleep', sleep);
    server.addMethod('error', error);
    server.addMethod('time', time);

    try {
        server.addMethod('null', null);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.addMethod('undefined', undefined);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.addMethod('1', 1);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        server.addMethod('string', `string`);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }

    expect(server.methods.has('echo')).toBe(true);
    expect(server.methods.has('sleep')).toBe(true);
    expect(server.methods.has('error')).toBe(true);
    expect(server.methods.has('time')).toBe(true);
    expect(server.methods.size).toBe(4);
    expect(server.methods.has('method_not_found')).toBe(false);
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
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
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