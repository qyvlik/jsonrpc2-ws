
import WebSocket from "ws";
import {JsonRpcServer, JsonRpcClient} from "../src/main.js"
import getPort from "get-port";

async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonRpcServer({port, clientTracking: true}, async () => {
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
const port = await getPort();

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

const clients = new Set();
let printTimes = 0;

test('test client add method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const print = async (params) => {
        const [msg] = params;
        console.info(`client print ${msg}`);
        printTimes++;
    }

    client.addMethod('print', print);

    expect(client.methods.has('print')).toBe(true);
    expect(client.methods.size).toBe(1);
    expect(client.methods.has('method_not_found')).toBe(false);
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