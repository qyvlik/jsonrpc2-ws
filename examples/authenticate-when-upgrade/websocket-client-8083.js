import WebSocket from "ws";

try {
    const id = Date.now();
    const ws = new WebSocket(`ws://localhost:8083/client-${id}`);
    ws.on('open', ()=>{
        ws.send(`from client-${id} message`)
    })
    ws.on('unexpected-response', (req, res)=>{
        console.error(`${req.path}`);
        console.error(`unexpected-response statusCode = ${res.statusCode}`);
        console.error(`unexpected-response headers = ${JSON.stringify(res.headers)}`);
    });
} catch (error) {
    console.info(`error${error.message}`);
}
