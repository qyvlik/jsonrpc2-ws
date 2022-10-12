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
            client.on('open', () => {
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

let server = null;
const port = 8081;

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

const clients = new Set();

test('test client add method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const echo = (params) => params;
    const error = (params) => {
        throw new Error(`${params[0]}`)
    };
    const time = () => Date.now();

    client.addMethod('echo', echo);
    client.addMethod('sleep', sleep);
    client.addMethod('error', error);
    client.addMethod('time', time);

    try {
        client.addMethod('null', null);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        client.addMethod('undefined', undefined);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        client.addMethod('1', 1);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }
    try {
        client.addMethod('string', `string`);
    } catch (error) {
        expect(error.message).toBe('method not function');
    }

    expect(client.methods.has('echo')).toBe(true);
    expect(client.methods.has('sleep')).toBe(true);
    expect(client.methods.has('error')).toBe(true);
    expect(client.methods.has('time')).toBe(true);
    expect(client.methods.size).toBe(4);
    expect(client.methods.has('method_not_found')).toBe(false);

});

test('test server call client method', async () => {
    expect(server.wss.clients.size).toBe(1);
    const websocket = server.wss.clients.values().next().value;
    expect(websocket).not.toBeNull();

    {
        const sleepMs = 1000;
        const gap = 50;
        const start = Date.now();
        const result = await server.request(websocket, 'sleep', [sleepMs]);
        const end = Date.now();
        const cost = (end - start);
        expect(result).toBeNull();
        expect(Math.abs(cost - sleepMs)).toBeLessThan(gap);
    }

    {
        const gap = 50;
        const start = Date.now();
        const result = await server.request(websocket, 'time', []);
        const realGap = (result - start);
        expect(realGap).toBeLessThan(gap);
    }
});

test('test server invalid params', async () => {
    expect(server.wss.clients.size).toBe(1);
    const websocket = server.wss.clients.values().next().value;
    expect(websocket).not.toBeNull();

    try {
        await server.request(websocket, 'lost_params');
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_NOT_FOUND);
        expect(message).toBe('Method not found');
    }

    try {
        await server.request(websocket, 'params_is_string', '');
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }

    try {
        await server.request(websocket, 'params_is_number', 111);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }

    try {
        await server.request(websocket, 'params_is_number', 111.1);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }
});

test('test server call not exist method', async () => {
    expect(server.wss.clients.size).toBe(1);
    const websocket = server.wss.clients.values().next().value;
    expect(websocket).not.toBeNull();

    try {
        await server.request(websocket, 'method_not_found', []);
        expect(false).toBe(true);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_NOT_FOUND);
        expect(message).toBe('Method not found');
    }
});

test('test server call error', async () => {
    expect(server.wss.clients.size).toBe(1);
    const websocket = server.wss.clients.values().next().value;
    expect(websocket).not.toBeNull();

    const error_string = Date.now() + '';
    try {
        await server.request(websocket, 'error', [error_string]);
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