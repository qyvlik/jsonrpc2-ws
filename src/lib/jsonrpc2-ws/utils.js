/**
 * https://www.jsonrpc.org/specification#request_object
 * @param json          {object}
 * @return {boolean}
 */
export function isRequest(json) {
    if (typeof json === 'undefined' || json == null) {
        return false;
    }
    return 'method' in json;
}

/**
 * https://www.jsonrpc.org/specification#response_object
 * @param json          {object}
 * @return {boolean}
 */
export function isResponse(json) {
    if (typeof json === 'undefined' || json == null) {
        return false;
    }
    const hasResult = 'result' in json;
    const hasError = 'error' in json;
    return ('id' in json) && !((hasResult && hasError) || (!hasResult && !hasResult));
}

export function idIsValidate(id) {
    return id !== null && (typeof id == 'number' || typeof id == 'string');
}

export function errorIsValidate(error) {
    return error !== null && typeof error !== 'undefined'
}

