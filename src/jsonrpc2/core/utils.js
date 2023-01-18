export const isType = (type, val) => {
    if (typeof val === 'undefined') {
        return type === 'undefined';
    }
    if (val === null) {
        return type === 'null';
    }
    return val.constructor.name.toLowerCase() === type.toLowerCase()
};

/**
 * https://www.jsonrpc.org/specification#request_object
 * @param json          {object}
 * @return {boolean}
 */
export function isRequest(json) {
    if (typeof json === 'undefined' || json == null || !isType("object", json)) {
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
    if (typeof json === 'undefined' || json == null || !isType("object", json)) {
        return false;
    }
    const hasResult = 'result' in json;
    const hasError = 'error' in json;
    return ('id' in json) && (!hasResult && hasError) || (hasResult && !hasError);
}

export function idIsValidate(id) {
    return id !== null && (typeof id == 'number' || typeof id == 'string');
}

export function paramsIsValidate(params) {
    const isUndefined = typeof params === 'undefined';
    const isArray = Array.isArray(params);
    const isObject = isType('object', params);
    return isUndefined || !((isArray && isObject) || (!isArray && !isObject));
}

export function errorIsValidate(error) {
    return error !== null && typeof error !== 'undefined'
}

export function wrapperErrorData(error) {
    return error instanceof Error
        ? {message: error.message, stack: error.stack, name: error.name}
        : error + '';
}

export function jsonrpcError(code, message, error) {
    return {
        code,
        message,
        data: wrapperErrorData(error)
    };
}