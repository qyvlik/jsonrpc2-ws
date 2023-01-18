import WebSocket from "ws";
import {JsonRpcWsClient, JsonRpcWsServer,} from "../src/main.js"
import getPort from "get-port";
import tries from "./lib/tries.js";

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

test('test server add method', () => {
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

test('test client batch call server method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const ids = [];
    const pipeline = client.createPipeline();
    const startCounter = 1;
    ids.push(await pipeline.request('counter'));
    ids.push(await pipeline.request('counter'));
    ids.push(await pipeline.request('counter'));
    ids.push(await pipeline.request('counter'));
    const responses = await pipeline.execute();
    expect(ids.length).toBe(responses.length);
    expect(responses.length).not.toBe(0);

    for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const idHere = ids[i];

        expect('result' in response).toBe(true);
        const {result, id, error} = response;

        expect(id).toEqual(idHere);
        expect(result).toEqual(startCounter + i);
    }
});

test('test client batch notification server method', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    const ids = [];
    const pipeline = client.createPipeline();
    ids.push(await pipeline.request('counter'));
    const notifyCount = 3;
    await tries(notifyCount, () => pipeline.notification('counter'));
    ids.push(await pipeline.request('counter'));

    const responses = await pipeline.execute();
    expect(ids.length).toBe(2);
    console.info(`responses=${JSON.stringify(responses)}`)
    expect(responses.length).toBe(2);
    const beginResponse = responses[0];
    const endResponse = responses[1];
    expect('result' in beginResponse).toBe(true);
    expect('result' in endResponse).toBe(true);
    const beginCount = beginResponse.result;
    const endCount = endResponse.result;
    const gap = (endCount - beginCount) - 1;
    expect(gap).toEqual(notifyCount);

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