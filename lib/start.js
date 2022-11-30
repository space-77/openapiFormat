"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const axios_1 = __importDefault(require("axios"));
const docApi_1 = __importDefault(require("./docApi"));
const utils_1 = require("./common/utils");
const translate_1 = __importDefault(require("./common/translate"));
const isChinese = require('is-chinese');
const converter = require('swagger2openapi');
const deepForEach = require('deep-for-each');
const tagsList = [];
function translateTagNames(options) {
    const { tags, subject, t, data } = options;
    tags.map(async (text) => {
        const tag = tagsList.find(i => i.text === text);
        if (!tag) {
            const tagItem = { subjects: [subject], text, textEn: '' };
            tagsList.push(tagItem);
            let textEn = await t.addTranslate(text);
            textEn = (0, utils_1.checkName)(textEn, name => tagsList.some(i => i.textEn === name));
            tagItem.textEn = textEn;
            tagItem.subjects.forEach(subject => {
                const index = subject.tags.findIndex(i => i === text);
                if (index > -1)
                    subject.tags[index] = textEn; // 替换原有的 tag 名称
                data.tags.forEach((tag) => {
                    if (tag.name === text)
                        tag.name = textEn;
                });
            });
        }
        else {
            tag.subjects.push(subject);
        }
    });
}
async function translate(data, dictList) {
    const t = new translate_1.default(dictList);
    const textList = [];
    const promsList = [];
    async function addTranslate(text, subject) {
        const item = textList.find(i => i.text === text);
        if (!item) {
            const newItem = { subjects: [subject], text: text };
            textList.push(newItem);
            try {
                const textTranslateProm = t.addTranslate(text);
                let textEn = (await textTranslateProm);
                // 查重,是否已存在相同的译文：如 你 翻译成 you, 但是 您 也可以翻译成 you
                textEn = (0, utils_1.checkName)(textEn, checkName => textList.some(i => i.text === checkName));
                newItem.textEn = textEn;
                newItem.subjects.forEach(i => {
                    i.$ref = i.$ref.replace(text, textEn);
                    i.originalRef = i.originalRef.replace(text, textEn);
                });
            }
            catch (error) { }
        }
        else {
            item.subjects.push(subject);
        }
    }
    function formatStr(value) {
        return value
            .replace(/»/g, '')
            .split('«')
            .filter(text => text.split('').some(isChinese));
    }
    async function forEachProm(value, key, subject) {
        if (key === 'originalRef') {
            // 切割
            subject.title = value;
            const texts = formatStr(value);
            texts.map(async (text) => {
                await addTranslate(text, subject);
            });
        }
        else if (key === 'tags' && subject !== data && Array.isArray(value) && value.length > 0) {
            translateTagNames({ t, tags: value, subject: subject, data });
        }
    }
    deepForEach(data, (value, key, subject) => {
        promsList.push(forEachProm(value, key, subject));
    });
    await t.translate();
    await Promise.all(promsList);
    if (data.definitions) {
        Object.entries(data.definitions).forEach(async ([key, value]) => {
            let newKey = key;
            const proms = formatStr(key).map(async (text) => {
                const textEn = await t.addTranslate(text);
                newKey = newKey.replace(text, textEn);
            });
            await Promise.all(proms);
            if (newKey === key)
                return;
            data.definitions[newKey] = value;
            delete data.definitions[key];
        });
        await t.translate();
    }
    return { data, dictList: t.dictList };
}
async function translateV3(data, dictList) {
    const t = new translate_1.default(dictList);
    const textEnList = new Set([]);
    deepForEach(data, async (value, key, subject) => {
        if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/')) {
            const [, , typeInfoKey, refNname] = value.split('/');
            if (refNname.split('').some(isChinese)) {
                let textEn = await t.addTranslate(refNname);
                textEn = (0, utils_1.checkName)(textEn, checkName => textEnList.has(checkName));
                textEnList.add(textEn);
                subject.$ref = subject.$ref.replace(refNname, textEn);
            }
        }
        else if (key === 'tags' && subject !== data && Array.isArray(value) && value.length > 0) {
            translateTagNames({ t, tags: value, subject: subject, data });
        }
    });
    await t.translate();
    if (data.components) {
        Object.values(data.components).forEach(moduleValue => {
            Object.entries(moduleValue).forEach(async ([key, value]) => {
                if (key.split('').some(isChinese)) {
                    const textEn = await t.addTranslate(key);
                    if (!moduleValue[textEn]) {
                        moduleValue[textEn] = value;
                        delete moduleValue[key];
                    }
                }
            });
        });
        await t.translate();
    }
    return { data, dictList: t.dictList };
}
/**
 * @desc 修复 swagger 转openAPI后变量名字太长问题
 */
function formatOpenapi3Name(json) {
    const names = new Set([]);
    const textMap = {};
    const { components } = json;
    if (!components)
        return;
    deepForEach(json, (value, key, subject) => {
        if (key === '$ref') {
            const [, , moduleName, refNname] = value.split('/');
            let newName = translate_1.default.startCaseClassName(refNname);
            if (newName === refNname)
                return;
            const moduleItem = textMap[moduleName];
            if (!moduleItem) {
                newName = (0, utils_1.checkName)(newName, checkName => names.has(checkName));
                names.add(newName);
                textMap[moduleName] = { refNname: newName };
            }
            else {
                if (moduleItem[refNname]) {
                    // 如果模块中已近存在了新名字，则直接使用模块的新名字
                    newName = moduleItem[refNname];
                }
                else {
                    newName = (0, utils_1.checkName)(newName, checkName => names.has(checkName));
                    names.add(newName);
                    moduleItem[refNname] = newName;
                }
            }
            subject.$ref = subject.$ref.replace(refNname, newName);
        }
    });
    Object.entries(textMap).forEach(([moduleName, names]) => {
        const moduleItem = components[moduleName];
        if (!moduleItem || !lodash_1.default.isObject(names))
            return;
        Object.entries(names).forEach(([key, name]) => {
            if (key === name)
                return;
            const moduleValue = moduleItem[key];
            if (moduleValue) {
                moduleItem[name] = moduleValue;
                delete moduleItem[key];
            }
        });
    });
}
async function getApiData(url, dictList) {
    return new Promise(async (resolve, reject) => {
        try {
            let data = null;
            if (lodash_1.default.isObject(url)) {
                data = url;
            }
            else {
                const res = await axios_1.default.get(url);
                data = res.data;
            }
            if (data.swagger === '2.0') {
                const { dictList: newDictList } = await translate(data, dictList);
                converter.convertObj(data, { components: true }, function (err, options) {
                    if (err) {
                        reject('swagger2.0 to openapi3.0 error');
                        return;
                    }
                    const json = options.openapi;
                    formatOpenapi3Name(json);
                    resolve({ json, dictList: newDictList });
                });
            }
            else {
                const { dictList: newDictList } = await translateV3(data, dictList);
                resolve({ json: data, dictList: newDictList });
            }
        }
        catch (error) {
            reject(error);
        }
    });
}
async function default_1(url, dictList = []) {
    try {
        const res = await getApiData(url, dictList);
        const docApi = new docApi_1.default(res.json);
        await docApi.init();
        return { docApi, dictList: res.dictList };
    }
    catch (error) {
        return Promise.reject(error);
    }
}
exports.default = default_1;
