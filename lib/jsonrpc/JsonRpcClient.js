import WebSocket from 'ws';

const jsonrpc = '2.0';

export default  class RpcClient {
    constructor() {
        this.ws = null;
        this.id = 0;
        this.callbacks = {};
    }

    open(wsHost) {
        const that = this;
        that.ws = new WebSocket(wsHost, {});
        that.ws.on('message', async (message) => {
            let resObj = null;
            try {
                resObj = JSON.parse(message);
            } catch (error) {
                console.error(`onmessage parse error: message:${message}, ${error.message}`);
                return;
            }

            const isArray = Array.isArray(resObj);
            const resList = isArray ? resObj : [resObj];
            for (const res of resList) {
                const {id} = res;
                if (id) {
                    const callback = that.callbacks[res.id];
                    if (callback) {
                        callback(resObj);
                        delete that.callbacks[resObj.id];
                    }
                }
            }
        });
        that.ws.on('close', () => {
            that.ws = null;
        });
        return new Promise((resolve, reject) => {
            that.ws.on('open', function open() {
                resolve();
            });
        });
    }

    call(method, params) {
        const that = this;
        if (that.ws === null || that.ws.readyState !== WebSocket.OPEN) {
            throw new Error('websocket readyState not OPEN');
        }
        const id = ++that.id;
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        return new Promise((resolve, reject) => {
            that.callbacks[id] = (resObj) => {
                if (resObj.error) {
                    reject(resObj.error)
                } else {
                    resolve(resObj.result);
                }
            };
            that.ws.send(reqMsg);
        });
    }
};
