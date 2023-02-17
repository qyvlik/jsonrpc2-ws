import PeerNode from "./peer-node.js";
import {v4 as uuidv4} from 'uuid';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

async function tries(times, fun) {
    while (times-- > 0) {
        await fun(times);
    }
}

const peers = [
    'peer-8081|ws://localhost:8081',
    'peer-8082|ws://localhost:8082',
    'peer-8083|ws://localhost:8083',
]

const ports = [8081, 8082, 8083];

const nodeList = [];

for (const port of ports) {
    const peer = await PeerNode.create(`peer-${port}`, port);
    peer.on('message', async ({id, forward, to, value}) => {
        console.info(`${peer.name} receive ${id} ${JSON.stringify(forward)} value=${value}`);
        // query db ...
    });
    nodeList.push(peer);
}

for (const peer of nodeList) {
    await peer.connect(peers);
}

await sleep(1000);

await tries(1000, async () => {
    await sleep(500);

    console.info(`-----------------------------------------`)
    const randomNode = nodeList[getRandomInt(nodeList.length)];
    console.info(`random node ${randomNode.name}`);
    await randomNode.broadcast({id: uuidv4(), value: `Date.now=${Date.now()}`});
});


