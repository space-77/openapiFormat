"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const node_translates_1 = require("node-translates");
class Translate {
    dictList;
    waitTranslateList = [];
    engines = [node_translates_1.iflyrecTranslator, node_translates_1.baiduTranslator, node_translates_1.bingTranslator];
    constructor(dictList = []) {
        this.dictList = dictList;
    }
    // private dictHasKey(key: string) {
    //   return this.dictList.some(i => i.zh === key)
    // }
    static startCaseClassName(textEn) {
        let wordArray = lodash_1.default.startCase(textEn).split(' ');
        if (wordArray.length > 5) {
            wordArray = [...wordArray.slice(0, 4), ...wordArray.slice(-1)];
        }
        // 处理以数字开头的异常
        return wordArray.join('').replace(/^\d+\S+/, $1 => `N${$1}`);
    }
    async onTranslate(texts, engineIndex = 0) {
        if (texts.length === 0)
            return [];
        console.log(`正在翻译共翻译 ${texts.length} 条数据`);
        if (engineIndex >= this.engines.length) {
            const errStr = 'translate error, all translate engine can not access';
            texts.forEach(i => i.reject(errStr));
            throw new Error(errStr);
        }
        try {
            const resList = await this.engines[engineIndex](texts.map(i => i.text));
            resList.forEach((i, index) => {
                i.en = Translate.startCaseClassName(i.en);
                this.dictList.push(i);
                texts[index].resolve(i.en);
            });
            return resList;
        }
        catch (error) {
            return this.onTranslate(texts, engineIndex + 1);
        }
    }
    find(text) {
        return this.dictList.find(i => i.zh === text);
    }
    addTranslate(text) {
        return new Promise((resolve, reject) => {
            this.waitTranslateList.push({ text, resolve, reject });
        });
    }
    async translate() {
        // 过滤出没有缓存的中文数据
        const texts = this.waitTranslateList.filter(i => {
            const item = this.dictList.find(j => j.zh === i.text);
            if (item)
                i.resolve(item.en);
            return !item;
        });
        await this.onTranslate(texts);
        this.waitTranslateList = [];
    }
}
exports.default = Translate;
