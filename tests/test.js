import JsonRpc from '../lib/jsonrpc/JsonRpc.js'

(async () => {

    const client = await JsonRpc.createClient("ws://localhost:8080");
    let d = 100;
    while (d-- > 0) {
        const result = await client.request('ping', []);
        console.info(`result=${result}`);
    }

})();
