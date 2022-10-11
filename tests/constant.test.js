import * as constant from '../src/lib/jsonrpc2-ws/constant.js'

test('test constant value not repeat', () => {
    const kvMap = new Map();
    const vkMap = new Map();
    for(const key in constant) {
        const value = constant[key];
        expect(kvMap.has(key)).toBe(false);
        expect(vkMap.has(value)).toBe(false);
        expect(typeof value !== 'undefined').toBe(true);

        kvMap.set(key, value);
        vkMap.set(value, key);
    }
});

