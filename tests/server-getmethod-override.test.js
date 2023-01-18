import WebSocket from "ws";
import {JSON_RPC_ERROR, JsonRpcWsClient, JsonRpcWsServer, JsonRpcError} from "../src/main.js"
import getPort from "get-port";

async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            server = new JsonRpcWsServer({port}, async () => {
                console.info(`server listen ${port}`);
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
            const client = new JsonRpcWsClient(url);
            client.on('open', () => {
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

let server = null;
const port = await getPort();

test('test server startup', async () => {
    server = await startupServer(port);
    expect(server).not.toBe(null);
});

test('test server method', () => {
    expect(server).not.toBe(null);

    /**
     *
     * @param id                    {string|number}
     * @param method                {string}
     * @param params                {object|array}
     * @param socket                {JsonRpcWsSocket}
     * @return {Promise<Function>}
     */
    server.handler.getMethod = async ({id, method, params}, socket) => {
        const auth = await socket.getContext('auth');
        if (!auth && method.startsWith('private')) {
            return () => {
                throw new JsonRpcError(JSON_RPC_ERROR, 'Need auth', undefined);
            }
        }
        return server.handler.methods.get(method);
    };

    const echo = (params) => params;
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
    const logout = async (params, socket) => {
        await socket.deleteContext('username');
        socket.setContext('auth', false);
        return true;
    }
    const whoami = async (params, socket) => {
        return await socket.getContext('username');
    }

    server.setMethod('public.echo', echo);
    server.setMethod('public.login', login);
    server.setMethod('private.logout', logout);
    server.setMethod('private.whoami', whoami);

    expect(server.handler.methods.has('public.echo')).toBe(true);
    expect(server.handler.methods.has('public.login')).toBe(true);
    expect(server.handler.methods.has('private.logout')).toBe(true);
    expect(server.handler.methods.has('private.whoami')).toBe(true);

    expect(server.handler.methods.size).toBe(4);
});

const clients = new Set();

test('test client call private method without login', async () => {
    const client = await startupClient(`ws://localhost:${port}`);
    expect(client).not.toBe(null);
    expect(client.ws.readyState).toBe(WebSocket.OPEN);
    clients.add(client);

    // client.handler.verbose = true;
    try {
        await client.request('private.whoami');
        expect(false).toBe(true);
    } catch (error) {
        expect(error).toEqual({code: JSON_RPC_ERROR, message: 'Need auth'});
    }

    const echoResult = await client.request('public.echo', ['hello']);
    expect(echoResult).toEqual(['hello']);

    try {
        await client.request('private.logout');
        expect(false).toBe(true);
    } catch (error) {
        expect(error).toEqual({code: JSON_RPC_ERROR, message: 'Need auth'});
    }

    const loginResult = await client.request('public.login', ['hello', 'hello']);
    expect(loginResult).toBe(true);

    const username = await client.request('private.whoami');
    expect(username).toBe('hello');
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