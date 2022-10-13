import WebSocket from "ws";
import {
    JsonRpcServer,
    JsonRpcClient,
    JsonRpcMessageInterceptor,
    JsonRpcRequestInterceptor,
    JSON_RPC_ERROR,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    jsonrpc,
} from "../src/main.js"
import Store from './lib/store.js';

async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonRpcServer({port}, async () => {
                resolve(server);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function startupClient(url) {
    return new Promise((resolve, reject) => {
        try {
            const client = new JsonRpcClient(url);
            client.on('open', () => {
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

let server = null;
const port = 8084;

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

test('test server method', () => {
    expect(server).not.toBe(null);
    let maxId = 0;
    const preHandle = ({id, method, params}, websocket) => {
        if (!('ctx' in websocket)) {
            websocket.ctx = {
                auth: false,
                username: '',
                id: maxId++
            };
        }
        Store.enterWith(websocket.ctx);

        if (!websocket.ctx.auth && method.startsWith('private')) {
            return {
                id, jsonrpc, error: {code: JSON_RPC_ERROR, message: 'Need auth'}
            };
        }

        // not return mean keep going
    };
    const postHandle = (response, websocket) => {
        // you can i18n message here
        response.websocket_id = `${websocket.ctx.id}`;
    };
    server.processor.interceptor.request = new JsonRpcRequestInterceptor(preHandle, postHandle);

    const echo = (params) => params;
    const login = (params, websocket) => {
        const [username, password] = params;
        websocket.ctx.auth = password === username;
        if (websocket.ctx.auth) {
            websocket.ctx.username = username;
        } else {
            delete websocket.ctx.username;
        }
        return websocket.ctx.auth;
    };
    const logout = (params, websocket) => {
        delete websocket.ctx.username;
        websocket.ctx.auth = false;
        return true;
    }
    const whoami = (params, websocket) => {
        const ctx = Store.getStore();
        expect(ctx).not.toBeUndefined();
        expect(ctx).not.toBeNull();
        expect(websocket.ctx.username).toBe(ctx.username);
        return ctx.username;
    }

    server.addMethod('public.echo', echo);
    server.addMethod('public.login', login);
    server.addMethod('private.logout', logout);
    server.addMethod('private.whoami', whoami);

    expect(server.methods.has('public.echo')).toBe(true);
    expect(server.methods.has('public.login')).toBe(true);
    expect(server.methods.has('private.logout')).toBe(true);
    expect(server.methods.has('private.whoami')).toBe(true);

    expect(server.methods.size).toBe(4);
});

const clients = new Set();

test('test client call private method without login', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);



});


afterAll(async () => {
    for (const client of clients) {
        client.ws.close();
    }
    return new Promise((resolve, reject) => {
        if (server != null) {
            server.wss.close(resolve);
        } else {
            resolve();
        }
    });
});