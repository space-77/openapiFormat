import _ from 'lodash'
import { iflyrecTranslator, baiduTranslator, bingTranslator, Languages } from 'node-translates'
import { pinyin } from 'pinyin-pro'
import { fixStartNum, isChinese, isWord } from './utils'
// import { isWordCharacter } from 'is-word-character'
// const isChinese = require('is-chinese')

export type DictList = { zh: string; en: string | null; form?: '讯飞' | '百度' | '微软' }
export type WaitTranslate = {
  text: string
  type?: string
  reject: (reason?: any) => void
  resolve: (value: string) => void
}
export type FixText = (textEn: string, type?: string) => string
export enum TranslateType {
  none,
  pinyin,
  english
}

export enum TranslateCode {
  TRANSLATE_ERR
}
export default class Translate {
  private waitTranslateList: WaitTranslate[] = []
  private engines = [
    { t: iflyrecTranslator, name: '讯飞' },
    { t: bingTranslator, name: '微软' },
    { t: baiduTranslator, name: '百度' } // 百度保底
  ]

  constructor(public dictList: DictList[] = [], public type = TranslateType.english) {}
  // constructor(public dictList: DictList[] = [], public type?: TranslateType) {}

  // private dictHasKey(key: string) {
  //   return this.dictList.some(i => i.zh === key)
  // }

  static startCaseClassName(text: string, type: TranslateType, maxWordLen = 5) {
    let wordArray = _.startCase(text).split(' ').filter(Boolean)

    // TODO 需要修改逻辑
    if (wordArray.length > maxWordLen) {
      if (type === TranslateType.english) {
        wordArray = [...wordArray.slice(0, maxWordLen - 1), ...wordArray.slice(-1)]
      } else {
        wordArray = wordArray.slice(0, maxWordLen)
      }
    }

    // 处理以数字开头的异常
    return fixStartNum(wordArray.join(''))
  }

  protected translateFail(text: WaitTranslate) {
    this.dictList.push({ en: null, zh: text.text })
    const errStr = 'translate error, all translate engine can not access'
    text.reject(errStr)
    throw new Error(errStr)
  }

  protected toPinyin(text: string, type: TranslateType) {
    const texts = text.split('')
    let newTexts: string[] = []
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i]
      if (isChinese(t)) {
        newTexts.push(`--${pinyin(t, { toneType: 'none' })}`)
      } else {
        newTexts.push(t)
      }
    }
    return Translate.startCaseClassName(newTexts.join(''), type)
  }

  protected async _translate(text: WaitTranslate, fixText?: FixText, engineIndex = 0) {
    if (this.type === TranslateType.pinyin || this.type === TranslateType.none) {
      // 转拼音
      try {
        const textEn = this.toPinyin(text.text, this.type)
        this.dictList.push({ en: textEn, zh: text.text })
        text.resolve(textEn)
      } catch (error) {
        return this.translateFail(text)
      }
    } else {
      // 翻译
      if (engineIndex >= this.engines.length) {
        return this.translateFail(text)
      }
      try {
        const { dst } = await this.engines[engineIndex].t({ text: text.text, from: Languages.ZH, to: Languages.EN })
        let textEn = typeof fixText === 'function' ? fixText(dst, text.type) : dst
        textEn = Translate.startCaseClassName(textEn, this.type)
        this.dictList.push({ en: textEn, zh: text.text })
        text.resolve(textEn)
      } catch (error) {
        // console.error('翻译失败，正在换一个平台重试')
        this._translate(text, fixText, engineIndex + 1)
      }
    }
  }

  private async onTranslate(texts: WaitTranslate[], fixText?: FixText): Promise<void> {
    try {
      const proms = texts.map(async i => this._translate(i, fixText))
      await Promise.all(proms)
    } catch (error) {
      return Promise.reject({ code: TranslateCode.TRANSLATE_ERR, error, dictList: this.dictList })
    }
  }

  find(text: string) {
    return this.dictList.find(i => i.zh === text)
  }

  addTranslate(text: string, type?: string) {
    return new Promise<string>((resolve, reject) => {
      this.waitTranslateList.push({ text, resolve, reject, type })
    })
  }

  cutArray<T>(array: T[], subLength: number): T[][] {
    let index = 0
    let newArr = []
    while (index < array.length) {
      newArr.push(array.slice(index, (index += subLength)))
    }
    return newArr
  }

  async translate(fixText?: FixText) {
    // 过滤出没有缓存的中文数据
    const texts = this.waitTranslateList.filter(i => {
      const item = this.dictList.find(j => j.zh === i.text)
      if (item && item.en) i.resolve(item.en)
      return !item?.en ?? true
    })
    this.waitTranslateList = []

    if (texts.length > 0) {
      console.log(`正在翻译共翻译 ${texts.length} 条数据`)
      try {
        await this.onTranslate(texts, fixText)
      } catch (error) {
        return Promise.reject(error)
      }
      console.log('翻译完成')
    }
  }
}
