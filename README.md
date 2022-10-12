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
    const timeFromServer = await client.request('time', []);
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

# Dependencies

- https://github.com/websockets/ws
- https://github.com/sindresorhus/p-queue
- https://jestjs.io/zh-Hans/docs/getting-started
- https://jestjs.io/zh-Hans/docs/expect#expectclosetonumber-numdigits
