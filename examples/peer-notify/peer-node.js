import {EventEmitter} from "events";
import {JsonRpcWsClient, JsonRpcWsServer} from "../../src/main.js";
import LRUCache from 'lru-cache'

export default class PeerNode extends EventEmitter {
    static PEER_MESSAGE_HANDLE = 'peer-message-handle';

    /**
     * @param name      {string}
     * @param server    {JsonRpcWsServer}
     */
    constructor(name, server) {
        super();
        this.name = name;
        this.server = server;
        this.peers = new Map();
        this.messageIds = new LRUCache({
            max: 1000,
            // how long to live in ms
            ttl: 1000 * 60 * 5,
        });
    }

    /**
     * @param name                  {string}
     * @param port                  {number}
     * @return {Promise<PeerNode>}
     */
    static async create(name, port) {
        return new Promise((resolve, reject) => {
            try {
                const server = new JsonRpcWsServer({port}, async () => {
                    console.info(`peer ${name} listen ${port}`);
                    const peer = new PeerNode(name, server);
                    server.setMethod(PeerNode.PEER_MESSAGE_HANDLE, async ({id, forward, to, value}) => {
                        await peer.handleMessage({id, forward, to, value});
                    });
                    resolve(peer);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     *
     * @param peers                 {[string]}
     * @return {Promise<void>}
     */
    async connect(peers) {
        for (const peer of peers) {
            const [name, url] = peer.split('|');
            if (name === this.name) {
                continue;
            }
            if (this.peers.has(name)) {
                continue;
            }
            try {
                const client = await JsonRpcWsClient.connect(url);
                client.on('close', async (code, reason) => {
                    this.peers.delete(name);
                });
                this.peers.set(name, client);
            } catch (error) {
                console.error(`connect ${url} failure : ${error.message} ${error.stack}`);
            }
        }
    }

    /**
     *
     * @param id                    {string|number}
     * @param to                    {string}
     * @param forward               {[string]}
     * @param value               {any}
     * @return {Promise<void>}
     */
    async handleMessage({id, forward, to, value}) {
        if (to !== this.name) {
            console.warn(`${this.name} handleMessage skip message-id=${id}, to=${to} !== ${this.name} `);
            return;
        }
        if (forward.includes(this.name)) {
            console.warn(`${this.name} handleMessage skip message-id=${id}, forward includes ${this.name}`);
            return;
        }
        if (this.messageIds.has(id)) {
            console.warn(`${this.name} handleMessage skip message-id=${id}, already handle`);
            return;
        }
        this.messageIds.set(id, '');

        this.emit('message', {id, forward, to, value});

        for (const [to, client] of this.peers) {
            if (forward.includes(to)) {
                continue;
            }
            const message = {id, forward, to, value};
            if (!message.forward.includes(this.name)) {
                message.forward.push(this.name);
            }
            try {
                await client.notification(PeerNode.PEER_MESSAGE_HANDLE, message);
            } catch (error) {
                console.error(`${this.name} handleMessage failure : notification ${error.message}, ${error.stack}`);
            }
        }
    }

    /**
     * @param id            {string|number}
     * @param to            {string}
     * @param value         {any}
     * @return {Promise<boolean>}
     */
    async sendMessage({id, to, value}) {
        if (to === this.name || !this.peers.has(to)) {
            return false;
        }
        const client = this.peers.get(to);
        if (typeof client === 'undefined') {
            return false;
        }
        const forward = [this.name];
        const message = {id, forward, to, value};
        try {
            await client.notification(PeerNode.PEER_MESSAGE_HANDLE, message);
        } catch (error) {
            console.error(`sendMessage notification failure : ${error.message}, ${error.stack}`);
            return false;
        }
        return true;
    }

    /**
     *
     * @param id            {string|number}
     * @param value         {any}
     * @return {Promise<void>}
     */
    async broadcast({id, value}) {
        const forward = [this.name];

        for (const [to, client] of this.peers) {
            if (forward.includes(to)) {
                continue;
            }
            const message = {id, forward, to, value};
            try {
                await client.notification(PeerNode.PEER_MESSAGE_HANDLE, message);
            } catch (error) {
                console.error(`broadcast notification failure : ${error.message}, ${error.stack}`);
            }
        }
    }
}