const WebSocket = require('ws');

const jsonrpc = '2.0';

module.exports = class RpcClient {
    constructor() {
        this.ws = null;
        this.id = 0;
        this.callbacks = {};
        this.notifications = {};
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
                const {id, method} = res;
                if (id) {
                    const callback = that.callbacks[res.id];
                    if (callback) {
                        callback(resObj);
                        delete that.callbacks[resObj.id];
                    }
                }
                if (method) {
                    const {params} = res;
                    const notification = that.notifications[method];
                    if (notification) {
                        Array.isArray(params) ? notification(...params) : notification(params);
                    }
                }
            }
        });
        return new Promise((resolve, reject) => {
            that.ws.on('open', function open() {
                resolve();
            });
        });
    }

    call(method, params) {
        const id = ++this.id;
        const reqMsg = JSON.stringify({jsonrpc, id, method, params});
        const thiz = this;
        return new Promise((resolve, reject) => {
            thiz.callbacks[id] = (resObj) => {
                if (resObj.error) {
                    reject(resObj.error)
                } else {
                    resolve(resObj.result);
                }
            };
            thiz.ws.send(reqMsg);
        });
    }

    addNotification(method, func) {
        if (typeof func !== 'function') throw new Error('func not function');
        this.notifications[method] = func;
    }
};
