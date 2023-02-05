import WebSocket from "ws";
import {closeAllSocket, startupClient, startupServer, wsPort} from './lib/jsonrpc-helper.js'

let server = null;

beforeAll(async () => {
    server = await startupServer(wsPort);
    expect(server).not.toBe(null);
});

const clients = new Set();
let printTimes = 0;

test('test client add method', async () => {
    const client = await startupClient(`ws://localhost:${wsPort}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const print = async (params) => {
        const [msg] = params;
        console.info(`client print ${msg}`);
        printTimes++;
    }

    client.setMethod('print', print);

    expect(client.handler.methods.has('print')).toBe(true);
    expect(client.handler.methods.size).toBe(1);
    expect(client.handler.methods.has('method_not_found')).toBe(false);
});

test('test server send notification', async () => {
    expect(server.wss.clients.size).toBe(1);
    const websocket = server.wss.clients.values().next().value;
    expect(websocket).not.toBeNull();

    const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const maxNotifyCount = 10;
    let count = maxNotifyCount;
    while (count-- > 0) {
        const result = await server.notification(websocket, 'print', [count]);
        expect(result).toBeUndefined();
    }

    await sleep(1000);

    expect(printTimes).toBeGreaterThan(0);
    expect(printTimes).toBe(maxNotifyCount);
});

afterAll(async () => {
    await closeAllSocket();
});