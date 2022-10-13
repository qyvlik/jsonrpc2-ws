import {AsyncLocalStorage} from "async_hooks";

const ALS = new AsyncLocalStorage();

export default class Store {
    static getStore() {
       return ALS.getStore();
    }
    static enterWith(data) {
        return ALS.enterWith(data);
    }
}
