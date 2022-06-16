import JsonRpcWS from '../lib/jsonrpc-ws/JsonRpcWS.js'
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

const client = new JsonRpc({role: 'client'});
client.addMethod("heart", async (params) => {
    console.info(`heart:`, params);
});

await JsonRpcWS.connectServer(client, "ws://localhost:8080");

try {
    let d = 100;
    while (d-- > 0) {
        const result = await client.request('ping', []);
        console.info(`result=${result}`);
    }

    await client.request('sleep', [1000]);
    console.info(`call sleep`);

} catch (error) {
    console.error(error)
}

await client.request('interval_echo', {enable: true, timeout: 500});

await client.request('sleep', [5000]);

await client.request('interval_echo', {enable: false, timeout: 500});

