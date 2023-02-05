import getPort from 'get-port';
import {JsonRpcWsClient, JsonRpcWsServer} from "../../src/main.js";
import {createServer} from "http";

export const wsPort = await getPort();

const servers = new Set();
const clients = new Set();

export async function startupServer(port) {
    return new Promise((resolve, reject) => {
        try {
            const server = new JsonRpcWsServer({port}, async () => {
                console.info(`server listen ${port}`);
                resolve(server);
            });
            servers.add(server);
        } catch (error) {
            reject(error);
        }
    });
}

export async function startupServerWithOptions(options) {
    return new JsonRpcWsServer(options);
}

/**
 * @callback Authenticate
 * @param request               {http.IncomingMessage}
 * @return {Promise<boolean>}
 */
/**
 *
 * @param port      {number}
 * @param wss       {WebSocketServer}
 * @param authenticate {Authenticate}
 * @return {Promise<unknown>}
 */
export async function createHttpServer(port, wss, authenticate) {
    const httpServer = createServer();
    httpServer.on('upgrade', async (request, socket, head) => {
        const pass = await authenticate(request);
        if (pass) {
            wss.handleUpgrade(request, socket, head, function done(ws) {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    });
    return new Promise((resolve, reject) => {
        try {
            httpServer.listen(port, () => {
                console.info(`httpServer listen ${port}`);
                resolve(httpServer);
            });
        } catch (error) {
            reject(error);
        }
    });
}

export async function startupClient(url) {
    const client = await JsonRpcWsClient.connect(url);
    clients.add(client);
    return client;
}

async function closeWss(wss) {
    return new Promise((resolve) => {
        wss.close(resolve);
    });
}

export async function closeAllSocket() {
    try {
        for (const client of clients) {
            if (!(client.socket.isOpen())) {
                continue;
            }
            try {
                client.ws.close();
            } catch (error) {
                console.error(`error=${error.message}, ${error.stack}`);
            }

        }
        for (const server of servers) {
            await closeWss(server.wss);
        }
    } catch (error) {
        console.error(error.message, error.stack)
    }
}