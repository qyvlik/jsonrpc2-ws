import {isRequest, isResponse} from "../src/lib/jsonrpc2-ws/utils.js";

test('test response', () => {
    const data = {
        "id": 2,
        "jsonrpc": "2.0",
        "error": {"code": -32600, "message": "Invalid Request", "data": "Both request and response"}
    };

    expect(isResponse(data)).toBe(true);
    expect(isRequest(data)).toBe(false);
});


test('test request', () => {
    const data = {"id": 1, "jsonrpc": "2.0", "result": ["hello"]};

    expect(isResponse(data)).toBe(true);
    expect(isRequest(data)).toBe(false);
});
