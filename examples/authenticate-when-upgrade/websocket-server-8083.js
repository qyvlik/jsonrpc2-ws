import {createServer} from 'http';
import {WebSocketServer} from 'ws';

const httpServer = createServer();
const wss = new WebSocketServer({noServer: true});

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function authenticate(request) {
    console.info(`authenticate url=${request.url}`);
    return true;
}

wss.on('connection', function connection(ws, request) {
    ws.on('message', async(data)=> {
        console.log(`Received message ${data}, url=${request.url}`);
        await sleep(1000);
        ws.close();
    });
});

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

httpServer.listen(8083, () => {
    console.info(`http server 8083`);
});


