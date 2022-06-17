import JsonRpcWS from '../lib/jsonrpc-ws/JsonRpcWS.js'
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(1);
});

const client = new JsonRpc({role: 'client'});

client.addMethod("heart", async (params) => {
    console.info(`heart:`, params);
});

await JsonRpcWS.connectServer(client, "ws://localhost:8080");

await client.request('interval_echo', {enable: true, timeout: 500});

await client.request('sleep', [5000]);

await client.request('interval_echo', {enable: false, timeout: 500});

JsonRpcWS.close(client);

process.exit(0);