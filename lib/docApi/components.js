"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schemas_1 = __importDefault(require("./components/schemas"));
const Responses_1 = __importDefault(require("./components/Responses"));
const parameters_1 = __importDefault(require("./components/parameters"));
const requestBodies_1 = __importDefault(require("./components/requestBodies"));
const utils_1 = require("../common/utils");
const custom_1 = __importDefault(require("./components/custom"));
class Components {
    baseDate;
    pathItems;
    // components!: OpenAPIV3.ComponentsObject
    // schemas: Record<string, Schemas> = {}
    // responses: Record<string, Responses> = {}
    // parameters: Record<string, Parameters> = {}
    // requestBodies: Record<string, RequestBodies> = {}
    // // TODO 一下数据没处理
    // links: Record<string, TypeInfoBase> = {}
    // headers: Record<string, TypeInfoBase> = {}
    // examples: Record<string, TypeInfoBase> = {}
    // callbacks: Record<string, TypeInfoBase> = {}
    // securitySchemes: Record<string, TypeInfoBase> = {}
    typeInfoList = [];
    constructor(baseDate, pathItems) {
        this.baseDate = baseDate;
        this.pathItems = pathItems;
        // 先创建对象再处理数据， 方便打通类型之间的互相引用。
        this.createsObj();
        this.createsPathType();
        this.formatCode();
    }
    checkName(name) {
        return (0, utils_1.checkName)(name, checkName => this.typeInfoList.some(i => i.typeName === checkName));
        // const hasName = this.typeInfoList.some(i => i.typeName === name)
        // const lastNumReg = /((?!0)\d+)$/
        // if (hasName) {
        //   let newName = ''
        //   if (!lastNumReg.test(name)) {
        //     newName = `${name}1`
        //   } else {
        //     newName = name.replace(lastNumReg, $1 => `${Number($1) + 1}`)
        //   }
        //   return this.checkName(newName)
        // }
        // return name
    }
    pushTypeItem(typeInfo) {
        this.typeInfoList.push({ typeName: typeInfo.typeName, moduleName: typeInfo.moduleName, typeInfo });
    }
    createsObj() {
        const { schemas = {}, parameters = {}, requestBodies = {}, responses = {} } = this.baseDate.components ?? {};
        Object.entries(schemas).forEach(([name, data]) => {
            const option = { parent: this, name, data, moduleName: 'schemas' };
            const typeItem = new schemas_1.default(option);
            this.pushTypeItem(typeItem);
        });
        Object.entries(parameters).forEach(([name, data]) => {
            const option = { parent: this, name, datas: [data], moduleName: 'parameters' };
            const typeItem = new parameters_1.default(option);
            this.pushTypeItem(typeItem);
        });
        Object.entries(requestBodies).forEach(([name, data]) => {
            const option = { parent: this, name, data, moduleName: 'requestBodies' };
            const typeItem = new requestBodies_1.default(option);
            this.pushTypeItem(typeItem);
        });
        Object.entries(responses).forEach(([name, data]) => {
            const option = { parent: this, name, data, moduleName: 'responses' };
            const typeItem = new Responses_1.default(option);
            this.pushTypeItem(typeItem);
        });
    }
    createsPathType() {
        for (const pathItem of this.pathItems) {
            const { item, name, bodyName, paramsName, responseName } = pathItem;
            const { parameters, responses, requestBody, operationId } = item;
            const { description, content = {} } = responses['200'] ?? {};
            // FIXME 目前只取第一个， 当一个响应匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
            const [responseInfo] = Object.entries(content).sort(([a], [b]) => b.length - a.length);
            if (responseInfo) {
                const [media, { schema, example, examples, encoding }] = responseInfo;
                if (schema) {
                    const option = {
                        parent: this,
                        data: schema,
                        name: responseName,
                        moduleName: 'schemas',
                        resConentType: media
                    };
                    const response = new schemas_1.default(option);
                    this.pushTypeItem(response);
                    pathItem.responseType = response;
                }
            }
            if (parameters) {
                const option = { parent: this, name: paramsName, datas: parameters, moduleName: 'parameters' };
                const parameter = new parameters_1.default(option);
                this.pushTypeItem(parameter);
                pathItem.parameterType = parameter;
            }
            if (requestBody) {
                const option = { parent: this, name: bodyName, data: requestBody, moduleName: 'requestBodies' };
                const requestBodies = new requestBodies_1.default(option);
                this.pushTypeItem(requestBodies);
                pathItem.requestBodyType = requestBodies;
            }
        }
    }
    formatCode() {
        this.typeInfoList.forEach(i => {
            i.typeInfo.init();
        });
    }
    addCustomType(name, types) {
        const option = { parent: this, name, datas: types, moduleName: 'custom' };
        const typeInfo = new custom_1.default(option);
        this.pushTypeItem(typeInfo);
        return typeInfo;
    }
}
exports.default = Components;
