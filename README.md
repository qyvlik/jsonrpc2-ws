# jsonrpc2-ws

A simple implementation of [JSON-RPC 2.0](https://www.jsonrpc.org/specification) over WebSocket for Node.js

## Install

```bash
npm i @c10k/jsonrpc2-ws
```

# Usage

## Server

`JsonRpcWsServer` constructor params same
as [WebSocketServer](https://github.com/websockets/ws/blob/8.6.0/lib/websocket-server.js#L30-L56).

```js
const port = 8080;
const server = new JsonRpcWsServer({port});

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
const echo = (params) => params;
const error = (params) => {
    throw new Error(`${params[0]}`)
};
const time = () => Date.now();

server.setMethod('echo', echo);
server.setMethod('sleep', sleep);
server.setMethod('error', error);
server.setMethod('time', time);
```

## Client

`JsonRpcWsClient` constructor params same
as [WebSocket](https://github.com/websockets/ws/blob/8.6.0/lib/websocket.js#L45-L52).

```js
const url = `ws://localhost:8080`;
const client = await JsonRpcWsClient.connect(url);

const timeFromServer = await client.request('time');
console.info(`${timeFromServer}`);
```

# Use case

## Stream

```js
const port = 8080;
const server = new JsonRpcWsServer({port}, () => {
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
const client = await JsonRpcWsClient.connect(url);
client.setMethod('ping', (params) => {
    const [time] = params;
    console.info(`client receive server time=${time}`);
});
```

## Batch

```js
const port = 8080;
const server = new JsonRpcWsServer({port});

let count = 0;
server.setMethod('counter', () => ++count);
```

```js
const url = `ws://localhost:8080`;
const client = await JsonRpcWsClient.connect(url);

const pipeline = client.createPipeline();
await pipeline.request('counter');
await pipeline.request('counter');
await pipeline.request('counter');
const responses = await pipeline.execute();
for (const response of responses) {
    const {id, result, error} = response;
    // do something
}
```

## Define ID generator

```js
const url = `ws://localhost:8080`;
const client = await JsonRpcWsClient.connect(url);

client.idGenerator = () => uuid();
```

## Auth

```js
const port = 8080;
const server = new JsonRpcWsServer({port});
server.handler.getMethod = async ({id, method, params}, socket) => {
    const auth = await socket.getContext('auth');
    if (!auth && method.startsWith('private')) {
        return () => {
            throw new JsonRpcError(JSON_RPC_ERROR, 'Need auth', undefined);
        }
    }
    return server.handler.methods.get(method);
};

const login = async (params, socket) => {
    const [username, password] = params;
    const auth = password === username;
    socket.setContext('auth', auth);
    if (auth) {
        await socket.setContext('username', username);
    } else {
        await socket.deleteContext('username');
    }
    return auth;
};

const whoami = async (params, socket) => {
    return await socket.getContext('username');
}

server.setMethod('public.login', login);
server.setMethod('private.whoami', whoami);
```

```js
const url = `ws://localhost:8080`;
const client = await JsonRpcWsClient.connect(url);
await client.request('public.login', ['hello', 'hello']);
await client.request('private.whoami');
```

Authentication before connection, see https://github.com/websockets/ws/tree/8.6.0#client-authentication, example see [authenticate-when-upgrade](./examples/authenticate-when-upgrade)

# Dependencies

- https://github.com/websockets/ws
- https://jestjs.io/zh-Hans/docs/getting-started
- https://jestjs.io/zh-Hans/docs/expect#expectclosetonumber-numdigits
- https://github.com/sindresorhus/get-port

# Ref

- https://github.com/jershell/simple-jsonrpc-js/blob/master/simple-jsonrpc-js.js#L230-L275

# binary data

1. [Binary Data in JSON String. Something better than Base64](https://stackoverflow.com/questions/1443158/binary-data-in-json-string-something-better-than-base64/1443240#1443240)
   1. https://en.wikipedia.org/wiki/Ascii85
   2. https://github.com/bwaldvogel/base91/blob/main/src/main/java/de/bwaldvogel/base91/Base91.java
   3. https://github.com/kevinAlbs/Base122
2. https://en.wikipedia.org/wiki/Binary-to-text_encoding
