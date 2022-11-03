# jsonrpc2-ws

A simple implementation of [JSON-RPC 2.0](https://www.jsonrpc.org/specification) over WebSocket for Node.js

## Install

```bash
npm i @c10k/jsonrpc2-ws
```

# Usage

## Server

`JsonRpcServer` constructor params same as [WebSocketServer](https://github.com/websockets/ws/blob/8.6.0/lib/websocket-server.js#L30-L56).

```js
const port = 8080;
const server = new JsonRpcServer({port});

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
const echo = (params) => params;
const error = (params) => {
    throw new Error(`${params[0]}`)
};
const time = () => Date.now();

server.addMethod('echo', echo);
server.addMethod('sleep', sleep);
server.addMethod('error', error);
server.addMethod('time', time);
```

## Client

`JsonRpcClient` constructor params same as [WebSocket](https://github.com/websockets/ws/blob/8.6.0/lib/websocket.js#L45-L52).

```js
const url = `ws://localhost:8080`;
const client = new JsonRpcClient(url);

client.on('open', async () => {
    const timeFromServer = await client.request('time');
    console.info(`${timeFromServer}`);
});
```

# Use case

## Stream

```js
const port = 8080;
const server = new JsonRpcServer({port}, () => {
    setInterval(async () => {
        for (const ws of server.wss.clients) {
            // you can check ws context here
            server.notification(ws, 'ping', [Date.now]);
        }
    }, 1000);
});
```

```js
const url = `ws://localhost:8080`;
const client = new JsonRpcClient(url);
client.addMethod('ping', (params) => {
    const [time] = params;
    console.info(`client receive server time=${time}`);
});
```

## Batch

```js
const port = 8080;
const server = new JsonRpcServer({port});

let count = 0;
server.addMethod('counter', () => ++count);
```

```js
const url = `ws://localhost:8080`;
const client = new JsonRpcClient(url);

client.on('open', async () => {
    const pipeline = client.createPipeline();
    await pipeline.request('counter');
    await pipeline.request('counter');
    await pipeline.request('counter');
    const responses = await pipeline.execute();
    for(const response of responses) {
        const {id, result, error} = response;
        // do something
    }
});
```

## Define ID generator

```js
const url = `ws://localhost:8080`;
const client = new JsonRpcClient(url);

client.idGenerator = ()=> uuid();
```

## Auth

```js
const port = 8080;
const server = new JsonRpcServer({port});
server.processor.interceptor.request = new JsonRpcRequestInterceptor(({id, method, params}, websocket) => {
    if (!('ctx' in websocket)) {
        websocket.ctx = {auth: false, username: ''};
    }
    if (!websocket.ctx.auth && method.startsWith('private')) {
        return {
            id, jsonrpc, error: {code: JSON_RPC_ERROR, message: 'Need auth'}
        };
    }
    // not return mean keep going
});

const login = (params, websocket) => {
    const [username, password] = params;
    websocket.ctx.auth = password === username;
    return websocket.ctx.auth;
};

const whoami = (params, websocket) => {
    return websocket.ctx.username;
}
server.addMethod('public.login', login);
server.addMethod('private.whoami', whoami);
```

```js
const url = `ws://localhost:8080`;
const client = new JsonRpcClient(url);
await client.request('public.login', ['hello', 'hello']);
await client.request('private.whoami');
```

# Dependencies

- https://github.com/websockets/ws
- https://jestjs.io/zh-Hans/docs/getting-started
- https://jestjs.io/zh-Hans/docs/expect#expectclosetonumber-numdigits
- https://github.com/sindresorhus/get-port

# Ref

- https://github.com/jershell/simple-jsonrpc-js/blob/master/simple-jsonrpc-js.js#L230-L275
