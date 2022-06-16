
// https://www.jsonrpc.org/specification
// https://wiki.geekdream.com/Specification/json-rpc_2.0.html
const JSON_RPC_ERROR_PARSE_ERROR = -32700;
const JSON_RPC_ERROR_INVALID_REQUEST = -32600;
const JSON_RPC_ERROR_METHOD_NOT_FOUND = -32601;
const JSON_RPC_ERROR_METHOD_INVALID_PARAMS = -32602;
const JSON_RPC_ERROR_METHOD_INTERNAL_ERROR = -32603;

// -32000 to -32099 Server error Reserved for implementation-defined server-errors.

const jsonrpc = '2.0';

export {
    JSON_RPC_ERROR_PARSE_ERROR,
    JSON_RPC_ERROR_INVALID_REQUEST,
    JSON_RPC_ERROR_METHOD_NOT_FOUND,
    JSON_RPC_ERROR_METHOD_INVALID_PARAMS,
    JSON_RPC_ERROR_METHOD_INTERNAL_ERROR,
    jsonrpc
}