import JsonrpcServer from "../src/lib/jsonrpc2-ws/jsonrpc-server.js";
import JsonrpcClient from "../src/lib/jsonrpc2-ws/jsonrpc-client.js";

function time() {
    return Date.now();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const port = 8080;

async function test(client) {
    const maxCount = 10000;
    console.time(`call-time-${maxCount}`);
    {
        let count = maxCount;
        while (count-- > 0) {
            await client.request('time', []);
        }
    }
    console.timeEnd(`call-time-${maxCount}`);
}

const server = new JsonrpcServer({port: port}, async () => {
    console.info(`startup...`);
    const client = new JsonrpcClient(`ws://localhost:${port}`);

    await sleep(500);

    let count = 1000;
    while (count-- > 0) {
        await test(client);
    }
});

server.addMethod('time', time);


