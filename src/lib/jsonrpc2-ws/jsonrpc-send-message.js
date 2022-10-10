import WebSocket from "ws";
import {
    JSON_RPC_ERROR_INVALID_RESPONSE,
    JSON_RPC_ERROR_LOST_CONNECTION,
    JSON_RPC_ERROR_WS_ERROR,
    jsonrpc
} from "./constant.js";
import {errorIsValidate, idIsValidate} from "./utils.js";


/**
 *
 * @param websocket             {WebSocket}
 * @param id                    {string|number|undefined}
 * @param method                {string}
 * @param params                {object|array}
 * @param callbacks             {Map<string,function>|undefined}
 * @return {Promise<object>}
 */
export function sendRequest(websocket, {id, method, params}, callbacks = undefined) {
    if (websocket == null || websocket.readyState !== WebSocket.OPEN) {
        throw {jsonrpc, code: JSON_RPC_ERROR_LOST_CONNECTION, message: 'Lost connection!'};
    }
    const reqMsg = JSON.stringify({jsonrpc, id, method, params});
    return new Promise(async (resolve, reject) => {
        const needCallback = typeof callbacks !== 'undefined';
        if (needCallback && idIsValidate(id)) {
            callbacks.set(id, (response) => {
                const {error, result} = response;
                if (typeof result != 'undefined') {
                    resolve(result);
                } else {
                    reject(errorIsValidate(error) ? error : {
                        jsonrpc,
                        code: JSON_RPC_ERROR_INVALID_RESPONSE,
                        message: 'Invalid response'
                    });
                }
            });
        }

        try {
            websocket.send(reqMsg);
        } catch (error) {
            reject({
                jsonrpc,
                code: JSON_RPC_ERROR_WS_ERROR,
                message: 'WebSocket error',
                data: error
            });
        }
        if (!needCallback) {
            resolve();
        }
    });
}