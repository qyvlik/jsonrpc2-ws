import {JsonRpcWsClient} from "../src/main.js";

async function tries(times, fun) {
    while (times-- > 0) {
        await fun(times);
    }
}

async function benchmark_single_call(port) {
    const url = `ws://localhost:${port}/`;
    const client = await JsonRpcWsClient.connect(url);
    await tries(1000, async (c) => {
        console.time(`start:${port}:${c}`);
        const list = [];
        await tries(30000, async () => {
            const p = client.request('counter');
            list.push(p);
        })
        await Promise.all(list);
        console.timeEnd(`start:${port}:${c}`);
    });
    process.exit(0)
}

async function batch_call(client, batchSize) {
    const pipeline = client.createPipeline();
    await tries(batchSize, async () => {
        await pipeline.request('counter');
    });
    return await pipeline.execute();
}

async function benchmark_batch_call(port) {
    const url = `ws://localhost:${port}/`;
    const client = await JsonRpcWsClient.connect(url);
    await tries(1000, async (c) => {
        console.time(`start:${port}:${c}`);

        const list = [];
        await tries(3000, () => {
            list.push(batch_call(client, 100));
        });
        await Promise.all(list);

        console.timeEnd(`start:${port}:${c}`);
    });
    process.exit(0);
}

await benchmark_single_call(8081);

// benchmark_batch_call(8081);