import {closeAllSocket, startupClient, startupServerWithOptions,createHttpServer, wsPort} from '../lib/jsonrpc-helper.js';
import {createServer} from 'http';

let jsonRpcServer = null;
let httpServer = null;

/**
 *
 * @param request               {http.IncomingMessage}
 * @return {Promise<boolean>}
 */
async function authenticate(request) {
    console.info(`authenticate url=${request.url} failure`);
    return false;
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


test('test failure authenticate', async () => {
    const id = Date.now();
    try {
         await startupClient(`ws://localhost:${wsPort}/${id}`);
    } catch (error) {
        const {req, res} = error;
        expect(res.statusCode).toBe(401);
        // console.error(`unexpected-response statusCode path=${req.path}`);
        // console.error(`unexpected-response statusCode = ${res.statusCode}`);
        // console.error(`unexpected-response headers = ${JSON.stringify(res.headers)}`);
    }
});


afterAll(async () => {
    await closeAllSocket();
    httpServer.close();
});