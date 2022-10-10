import JsonrpcServer from "../src/lib/jsonrpc2-ws/jsonrpc-server.js";
import JsonrpcClient from "../src/lib/jsonrpc2-ws/jsonrpc-client.js";

function time() {
    return Date.now();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function echo(params) {
    return params;
}

function error() {
    throw new Error(`error!`);
}

const port = 8080;

const server = new JsonrpcServer({port: port}, async () => {
        console.info(`startup...`);
        const client = new JsonrpcClient(`ws://localhost:${port}`);
        client.addMethod('client-for-echo', (params) => {
            console.info(`call from server params=${params}`);
            return params;
        });
        client.addMethod('random', () => {
            return Math.random();
        });

        await sleep(500);

        const result1 = await client.request('echo', ['hello']);
        console.info(`result1=${result1}`);

        console.time("sleep");
        await client.request('sleep', [1000]);
        console.timeEnd("sleep");

        const result2 = await client.request('time', []);
        console.info(`result2=${result2}`);

        try {
            await client.request('error', []);
        } catch (error) {
            console.info(`error ${error.data.stack}`);
        }

        for (const ws of server.wss.clients) {
            await server.notification(ws, 'client-for-echo', [1]);
            const random = await server.request(ws, 'random', []);
            console.info(`random=${random}`);
            await server.notification(ws, 'client-for-echo', [random]);
        }
    })
;

server.addMethod('echo', echo);
server.addMethod('sleep', sleep);
server.addMethod('time', time);
server.addMethod('error', error);


