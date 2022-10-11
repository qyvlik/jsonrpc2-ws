import JsonrpcServer from "../src/lib/jsonrpc2-ws/jsonrpc-server.js";
import JsonrpcClient from "../src/lib/jsonrpc2-ws/jsonrpc-client.js";
import WebSocket from "ws";
import {
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS, JSON_RPC_ERROR_METHOD_NOT_FOUND,
} from "../src/lib/jsonrpc2-ws/constant.js";

async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonrpcServer({port}, async () => {
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
            const client = new JsonrpcClient(url);
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
    const error = () => {
        throw new Error(`error!`)
    };

    server.addMethod('echo', echo);
    server.addMethod('sleep', sleep);
    server.addMethod('error', error);

    expect(server.methods.has('echo')).toBe(true);
    expect(server.methods.has('sleep')).toBe(true);
    expect(server.methods.has('error')).toBe(true);
});

const clients = new Set();

test('test client startup', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    try {
        await client.request('lost_params');
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_INVALID_PARAMS);
        expect(message).toBe('Invalid params');
    }

    try {
        await client.request('method_not_found', []);
    } catch (error) {
        const {code, message} = error;
        expect(code).toBe(JSON_RPC_ERROR_METHOD_NOT_FOUND);
        expect(message).toBe('Method not found');
    }
});


afterAll(async () => {
    if (server != null) {
        server.wss.close();
    }
    for (const client of clients) {
        client.ws.close();
    }
});