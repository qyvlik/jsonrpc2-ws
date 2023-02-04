import getPort from 'get-port';
import {JsonRpcWsClient, JsonRpcWsServer} from "../../src/main.js";

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

export async function startupClient(url) {
    return new Promise((resolve, reject) => {
        try {
            const client = new JsonRpcWsClient(url);
            client.on('open', () => {
                resolve(client);
            });
            clients.add(client);
        } catch (error) {
            reject(error);
        }
    });
}

async function closeWss(wss) {
    return new Promise((resolve) => {
        wss.close(resolve);
    });
}

export async function closeAllSocket() {
    try {
        for (const client of clients) {
            client.ws.close();
        }
        for (const server of servers) {
            await closeWss(server.wss);
        }
    } catch (error) {
        console.error(error.message, error.stack)
    }
}