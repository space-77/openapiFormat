"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class Schemas extends base_1.default {
    data;
    resConentType;
    constructor(op) {
        const { parent, name, data, resConentType, moduleName } = op;
        super(parent, name, moduleName);
        this.data = data;
        this.resConentType = resConentType;
    }
    init = () => {
        const { data, name } = this;
        const { $ref } = data;
        if ($ref) {
            // 引用其它类型
            this.pushRef($ref);
        }
        else {
            this.typeItems.push(...this.createSchemaTypeItem(data, name));
        }
    };
}
exports.default = Schemas;
