// import JsonRpc from '../lib/jsonrpc/JsonRpc.js'

(async () => {

    // const client = await JsonRpc.createClient("ws://localhost:8080");
    // let d = 100;
    // while (d-- > 0) {
    //     const result = await client.request('ping', []);
    //     console.info(`result=${result}`);
    // }

    const a = {d: {d: () => 100}};
    const d = a?.d?.d || (() => 1);
    console.info(d());

})();
