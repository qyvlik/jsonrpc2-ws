import JsonRpcMethod from "../src/lib/jsonrpc2-ws/jsonrpc-method.js";

function method(name) {
    console.info(`name=${name}, this=${this}`);
    return name;
}

const m = new JsonRpcMethod(method, 1);

m.call('A01', null);
m.call('A02', null);
m.call('A03', null);
const r = await m.call('A04', null);

method('B00');

console.info(`r=${r}`);