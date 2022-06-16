import JsonRpcWS from '../lib/jsonrpc-ws/JsonRpcWS.js'
import JsonRpc from "../lib/jsonrpc-ws/JsonRpc.js";

(async () => {

    const client = new JsonRpc({role: 'client'});

    await JsonRpcWS.connectServer(client, "ws://localhost:8080");

    const result = await client.request('ping', []);
    // let d = 100;
    // while (d-- > 0) {
    //     console.info(`result=${result}`);
    // }

})();
