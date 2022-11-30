"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class Parameters extends base_1.default {
    datas;
    additionalProperties;
    constructor(op) {
        const { moduleName, parent, name, datas } = op;
        super(parent, name, moduleName);
        this.datas = datas;
    }
    init = () => {
        for (const keyItem of this.datas) {
            const { $ref } = keyItem;
            if ($ref) {
                this.pushRef($ref);
            }
            else if (keyItem) {
                this.typeItems.push(this.formatParameters(keyItem));
            }
        }
    };
}
exports.default = Parameters;
