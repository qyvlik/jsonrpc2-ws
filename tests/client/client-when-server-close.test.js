import {closeAllSocket, startupClient, startupServer, wsPort} from '../lib/jsonrpc-helper.js'

test('test client when server close', async () => {
    try {
        await startupClient(`ws://localhost:${wsPort}`);
    } catch (error) {
        expect(error.message).toBe(`connect ECONNREFUSED 127.0.0.1:${wsPort}`);
    }
});

afterAll(async () => {
    await closeAllSocket();
});


