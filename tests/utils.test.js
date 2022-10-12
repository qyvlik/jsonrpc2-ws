import {isRequest, isResponse, isType, paramsIsValidate} from "../src/jsonrpc2-ws/utils.js";

class TestClass {
}

test('test response 1', () => {
    const data = {
        "id": 2,
        "jsonrpc": "2.0",
        "error": {"code": -32600, "message": "Invalid Request", "data": "Both request and response"}
    };

    expect(isResponse(data)).toBe(true);
    expect(isRequest(data)).toBe(false);
});


test('test response 2', () => {
    const data = {"id": 1, "jsonrpc": "2.0", "result": ["hello"]};

    expect(isResponse(data)).toBe(true);
    expect(isRequest(data)).toBe(false);
});

test('test request & response 1', () => {
    const data = {"id": 1, "jsonrpc": "2.0"};

    expect(isResponse(data)).toBe(false);
    expect(isRequest(data)).toBe(false);
});

test('test request & response 2', () => {
    const data = {"id": 1, "jsonrpc": "2.0", "result": "result", "method": "111"};

    expect(isResponse(data)).toBe(true);
    expect(isRequest(data)).toBe(true);
});

test('test isType', () => {
    expect(isType('object', {})).toBe(true);
    expect(isType('object', 1)).toBe(false);
    expect(isType('object', 1.1)).toBe(false);
    expect(isType('object', 'str')).toBe(false);
    expect(isType('object', [])).toBe(false);
    expect(isType('string', 'str')).toBe(true);
    expect(isType('number', 1)).toBe(true);
    expect(isType('array', [])).toBe(true);
    expect(isType('object', undefined)).toBe(false);
    expect(isType('undefined', undefined)).toBe(true);
    expect(isType('null', null)).toBe(true);
});


test('test params', () => {
    expect(paramsIsValidate('')).toBe(false);
    expect(paramsIsValidate(undefined)).toBe(true);
    expect(paramsIsValidate(1)).toBe(false);
    expect(paramsIsValidate([])).toBe(true);
    expect(paramsIsValidate({})).toBe(true);
    expect(paramsIsValidate(_ => _)).toBe(false);
    expect(paramsIsValidate(new TestClass())).toBe(false);
});
