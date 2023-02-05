import {closeAllSocket, startupClient, startupServerWithOptions,createHttpServer, wsPort} from './lib/jsonrpc-helper.js';
import {createServer} from 'http';

let jsonRpcServer = null;
let httpServer = null;

/**
 *
 * @param request               {http.IncomingMessage}
 * @return {Promise<boolean>}
 */
async function authenticate(request) {
    console.info(`authenticate url=${request.url}`);
    return true;
}

beforeAll(async () => {
    jsonRpcServer = await startupServerWithOptions({noServer: true});
    expect(jsonRpcServer).not.toBe(null);

    jsonRpcServer.setMethod('whoami', (params, socket)=>{
        const req = socket.ws['__IncomingMessage'];
        if (typeof req !== 'undefined') {
            return req.url;
        }
        return '';
    })

    httpServer = await createHttpServer(wsPort, jsonRpcServer.wss, authenticate);
});


test('test empty', async () => {
    const id = Date.now();
    const client = await startupClient(`ws://localhost:${wsPort}/${id}`);
    console.info(`client /${id} is connected..`)
    const name = await client.request('whoami');
    expect(name).toBe(`/${id}`);
});


afterAll(async (done) => {
    await closeAllSocket();
    httpServer.close();
    done();
});