import WebSocket from "ws";

try {
    const id = Date.now();
    const ws = new WebSocket(`ws://localhost:8083/client-${id}`);
    ws.on('open', ()=>{
        ws.send(`from client-${id} message`);
    })
    ws.on('unexpected-response', (req, res)=>{
        console.error(`unexpected-response statusCode path=${req.path}`);
        console.error(`unexpected-response statusCode = ${res.statusCode}`);
        console.error(`unexpected-response headers = ${JSON.stringify(res.headers)}`);
    });
    ws.on('error', (...args)=>{
        console.error(`onerror ${args}`);
    });
    ws.on('close', (code, reason)=>{
        console.error(`onclose ${code} ${reason}`);
    });
} catch (error) {
    console.info(`error ${error.message}`);
}
