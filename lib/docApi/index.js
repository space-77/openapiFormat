"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const components_1 = __importDefault(require("./components"));
const common_1 = require("../common");
const utils_1 = require("../common/utils");
class DocApi {
    json;
    funcGroupList = [];
    pathItems = [];
    typeGroup;
    constructor(json) {
        this.json = json;
    }
    async init() {
        // 1、翻译
        // 2、先收集数据
        // 3、再整理数据
        const moduleList = this.funcGroup();
        this.formatFunsV2(moduleList);
        this.formatTypes();
    }
    formatTypes() {
        // 1、梳理 收集 类型以及类型索引
        // 2、整理 类型数据
        this.typeGroup = new components_1.default(this.json, this.pathItems);
    }
    funcGroup() {
        const { json } = this;
        const { tags: tagList = [], paths } = json;
        const moduleList = [];
        const funData = Object.entries(paths);
        for (const [apiPath, pathsObject] of funData) {
            if (!pathsObject)
                break;
            for (const method of common_1.httpMethods) {
                const item = pathsObject[method];
                if (!item)
                    continue;
                const { tags = ['moduleDef'] } = item;
                const funItem = { item, apiPath, method, tags };
                tags.forEach(tag => {
                    const moduleItem = moduleList.find(i => i.moduleName === tag);
                    if (!moduleItem) {
                        const tagInfo = tagList.find(i => i.name === tag);
                        moduleList.push({ moduleName: tag, funs: [funItem], tagInfo });
                    }
                    else {
                        moduleItem.funs.push(funItem);
                    }
                });
            }
        }
        return moduleList;
    }
    creatFunItem(funInfo, name, moduleName) {
        const { apiPath, method, item } = funInfo;
        const funcName = (0, utils_1.firstToUpper)(name);
        const bodyName = `${funcName}Body`;
        const paramsName = `${funcName}Params`;
        const responseName = `${funcName}Res`;
        return {
            item,
            name,
            method,
            apiPath,
            bodyName,
            moduleName,
            paramsName,
            responseName
        };
    }
    formatFunsV2(moduleList) {
        const pathInfoList = [];
        const funKeys = new Set([]);
        moduleList.forEach(moduleItem => {
            const { funs, moduleName, tagInfo } = moduleItem;
            const names = new Set([]);
            const samePath = (0, utils_1.getMaxSamePath)(funs.map(i => i.apiPath.slice(1)));
            const pathItems = funs.map(funInfo => {
                const { item, method, apiPath } = funInfo;
                let name = this.createFunName(apiPath, samePath, method, item.operationId);
                name = (0, utils_1.checkName)(name, checkName => names.has(checkName));
                names.add(name);
                const funItem = this.creatFunItem(funInfo, name, moduleName);
                this.pathItems.push(funItem);
                return funItem;
            });
            const pathInfo = { moduleName, tagInfo, pathItems };
            pathInfoList.push(pathInfo);
            return;
        });
        this.funcGroupList = pathInfoList;
    }
    createFunName(apiPath, samePath, method, operationId) {
        if (operationId) {
            //  整理 operationId 作为方法名
            return operationId.replace(/(.+)(Using.+)/, '$1');
            // name = operationId.replace(/_/, '')
        }
        else {
            // 整理 url 作为方法名
            return (0, utils_1.getIdentifierFromUrl)(apiPath, method, samePath);
        }
        // // TODO 如果转非 js 语言的代码，可能兼用该语言的关键字
        // if (isKeyword(name)) name = `${name}Func`
        // return name
    }
}
exports.default = DocApi;
