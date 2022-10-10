import JsonRpcMethod from "../src/lib/jsonrpc2-ws/jsonrpc-method.js";

function method(name) {
    console.info(`name=${name}, this=${this}`);
    return name;
}

const m = new JsonRpcMethod(method, 1);

m.invoke('A01', null);
m.invoke('A02', null);
m.invoke('A03', null);
const r = await m.invoke('A04', null);

method('B00');

console.info(`r=${r}`);