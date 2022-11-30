"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class RequestBodies extends base_1.default {
    data;
    required;
    contentType;
    additionalProperties;
    // TODO BodyObject  的 required 是控制 body 的集合是否必传，但是 body 和 params 合并，应该没什么意义了。
    constructor(op) {
        const { parent, name, data, moduleName } = op;
        super(parent, name, moduleName);
        this.data = data;
    }
    init() {
        const { $ref } = this.data;
        if ($ref) {
            // 引用其它类型
            this.pushRef($ref);
        }
        else {
            const { required } = this.data;
            const { content = {}, description } = this.data;
            this.required = required;
            this.description = description;
            // FIXME 目前只取字数最多的那个，
            // FIXME 当一个请求体类型匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
            const [[media, mediaTypeObject]] = Object.entries(content).sort(([a], [b]) => b.length - a.length);
            this.contentType = media;
            this.format(mediaTypeObject);
        }
    }
    format(mediaTypeObject) {
        const { schema, example, encoding } = mediaTypeObject;
        const { $ref } = schema;
        if ($ref) {
            // 引用其它类型
            this.pushRef($ref);
        }
        else if (schema) {
            const typeItemList = this.createSchemaTypeItem(schema, this.name);
            if (this.moduleName === 'requestBodies') {
                typeItemList.forEach(i => {
                    i.paramType = 'body';
                });
            }
            this.typeItems.push(...typeItemList);
        }
    }
}
exports.default = RequestBodies;
