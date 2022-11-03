import {JsonRpcServer} from "../src/main.js";

const port = 8082;

const server = new JsonRpcServer({port});

server.addMethod('info', () => {
    return {port};
});

server.addMethod('echo', (params) => {
    return params;
});

server.addMethod('time', () => {
    return Date.now();
});

let count = 0;
server.addMethod('counter', () => ++count);
