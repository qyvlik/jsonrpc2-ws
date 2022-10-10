import {isRequest, isResponse} from "../src/lib/jsonrpc2-ws/utils.js";

const data1 = {
    "id": 2,
    "jsonrpc": "2.0",
    "error": {"code": -32600, "message": "Invalid Request", "data": "Both request and response"}
};

console.info(`isResponse=${isResponse(data1)}`);
console.info(`isRequest=${isRequest(data1)}`);

const data2 = {"id": 1, "jsonrpc": "2.0", "result": ["hello"]};

console.info(`isResponse=${isResponse(data2)}`);
console.info(`isRequest=${isRequest(data2)}`);