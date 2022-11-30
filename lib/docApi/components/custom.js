"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class Custom extends base_1.default {
    datas = [];
    typeValue;
    constructor(op) {
        const { parent, name, datas, moduleName } = op;
        super(parent, name, moduleName);
        if (Array.isArray(datas)) {
            this.datas = datas;
        }
        else {
            this.typeValue = datas;
        }
    }
    init = () => {
        for (const keyItem of this.datas) {
            this.typeItems.push(this.formatParameters(keyItem));
        }
    };
}
exports.default = Custom;
