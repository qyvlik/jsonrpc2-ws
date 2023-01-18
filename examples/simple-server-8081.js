import {JsonRpcWsServer} from "../src/main.js";

const port = 8081;

const server = new JsonRpcWsServer({port});

// server.handler.verbose = true;

server.setMethod('info', () => {
    return {port};
});

server.setMethod('echo', (params) => {
    return params;
});

server.setMethod('time', () => {
    return Date.now();
});

let count = 0;
server.setMethod('counter', () => ++count);