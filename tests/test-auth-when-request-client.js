import JsonRpcWS from '../lib/jsonrpc-ws/JsonRpcWS.js'
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(1);
});

const AUTH_TOKEN = '6d2d791b-98ca-4d45-ad02-1ff04c0bb112';

async function withoutToken() {
    const client = new JsonRpc({role: 'client'});

    await JsonRpcWS.connectServer(client, `ws://localhost:8080`);

    try {
        await client.request('ping', [1000]);
    } catch (error) {
        console.assert(error.code === 401, JSON.stringify(error));
    }
}

async function withToken() {
    const client = new JsonRpc({role: 'client'});

    await JsonRpcWS.connectServer(client, `ws://localhost:8080`);
    const auth = await client.request('auth', {token: AUTH_TOKEN});

    console.assert(auth, auth);

    const result = await client.request('ping', []);
    console.info(`ping result=${result}`);
}

await withoutToken();
await withToken();

console.info(`done`);