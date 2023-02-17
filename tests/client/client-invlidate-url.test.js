import {closeAllSocket, startupClient, startupServer, wsPort} from '../lib/jsonrpc-helper.js'

test('test client invalidate url', async () => {
    try {
        await startupClient('fake://localhost:80');
    } catch (error) {
        expect(error.message).toBe(`The URL's protocol must be one of "ws:", "wss:", or "ws+unix:"`);
    }
});

afterAll(async () => {
    await closeAllSocket();
});