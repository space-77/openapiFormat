import _ from 'lodash'
import { iflyrecTranslator, baiduTranslator, bingTranslator, Languages } from 'node-translates'
import { pinyin } from 'pinyin-pro'
const isChinese = require('is-chinese')

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

  static startCaseClassName(textEn: string, maxWordLen = 5) {
    let wordArray = _.startCase(textEn).split(' ').filter(Boolean)
    if (wordArray.length > maxWordLen) {
      wordArray = [...wordArray.slice(0, maxWordLen - 1), ...wordArray.slice(-1)]
    }

    // 处理以数字开头的异常
    return wordArray.join('').replace(/^\d+\S+/, $1 => `N${$1}`)
  }

  protected translateFail(text: WaitTranslate) {
    this.dictList.push({ en: null, zh: text.text })
    const errStr = 'translate error, all translate engine can not access'
    text.reject(errStr)
    throw new Error(errStr)
  }

  protected async _translate(text: WaitTranslate, fixText?: FixText, engineIndex = 0) {
    if (this.type === TranslateType.none) {
      // 不翻译
      const textEn = Translate.startCaseClassName(text.text)
      this.dictList.push({ en: textEn, zh: text.text })
      console.log(textEn)
      text.resolve(textEn)
    } else if (this.type === TranslateType.pinyin) {
      // 转拼音
      try {
        const texts = text.text.split('')
        let newTexts: string[] = []
        for (let i = 0; i < texts.length; i++) {
          const t = texts[i]
          if (isChinese(t)) {
            newTexts.push(`--${pinyin(t, { toneType: 'none' })}`)
          } else {
            newTexts.push(t)
          }
        }
        const textEn = Translate.startCaseClassName(newTexts.join(''))
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
        textEn = Translate.startCaseClassName(textEn)
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
      return await this.onTranslate(texts, fixText)
      // console.log('翻译完成')
    }
  }
}
