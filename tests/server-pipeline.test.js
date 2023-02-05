import WebSocket from "ws";
import tries from "./lib/tries.js";

import {closeAllSocket, startupClient, startupServer, wsPort} from './lib/jsonrpc-helper.js';

let server = null;

beforeAll(async () => {
    server = await startupServer(wsPort);
    expect(server).not.toBe(null);
});

test('test server add method', () => {
    expect(server).not.toBe(null);

    server.setMethod('sendPipelineToClient', async (params, socket) => {
        const {notifyCount} = params;
        const pipeline = server.createPipeline(socket);
        const ids = [];
        ids.push(await pipeline.request('counter'));
        await tries(notifyCount, () => pipeline.notification('counter'));
        ids.push(await pipeline.request('counter'));

        const responses = await pipeline.execute();
        expect(ids.length).toBe(2);
        expect(responses.length).toBe(2);
        const beginResponse = responses[0];
        const endResponse = responses[1];
        expect('result' in beginResponse).toBe(true);
        expect('result' in endResponse).toBe(true);
        const beginCount = beginResponse.result;
        const endCount = endResponse.result;
        const gap = (endCount - beginCount) - 1;
        expect(gap).toEqual(notifyCount);
        return notifyCount;
    });

    expect(server.handler.methods.size).toBe(1);
    expect(server.handler.methods.has('method_not_found')).toBe(false);
});


test('test server pipeline', async () => {
    const client = await startupClient(`ws://localhost:${wsPort}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);

    let count = 0;
    const counter = () => ++count;
    client.setMethod('counter', counter);
    const notifyCount = 10;
    const result = await client.request('sendPipelineToClient', {notifyCount});
    expect(result).toBe(notifyCount);
});


afterAll(async () => {
    await closeAllSocket();
});