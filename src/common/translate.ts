import _ from 'lodash'
import { iflyrecTranslator, baiduTranslator, bingTranslator } from 'node-translates'

export type DictList = { zh: string; en: string }
export type WaitTranslate = { resolve: (value: string) => void; reject: (reason?: any) => void; text: string }
export type FixText = (enText: string) => string
export default class Translate {
  private waitTranslateList: WaitTranslate[] = []
  private engines = [iflyrecTranslator, baiduTranslator, bingTranslator]

  constructor(public dictList: DictList[] = []) {}

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

  private async onTranslate(texts: WaitTranslate[], fixText?: FixText, engineIndex = 0): Promise<DictList[]> {
    if (texts.length === 0) return []

    if (engineIndex >= this.engines.length) {
      const errStr = 'translate error, all translate engine can not access'
      texts.forEach(i => i.reject(errStr))
      throw new Error(errStr)
    }
    try {
      const resList = await this.engines[engineIndex](texts.map(i => i.text))
      resList.forEach((i, index) => {
        const textEn = typeof fixText === 'function' ? fixText(i.en) : i.en
        i.en = Translate.startCaseClassName(textEn)
        this.dictList.push(i)
        texts[index].resolve(i.en)
      })
      return resList
    } catch (error) {
      return this.onTranslate(texts, fixText, engineIndex + 1)
    }
  }

  find(text: string) {
    return this.dictList.find(i => i.zh === text)
  }

  addTranslate(text: string) {
    return new Promise<string>((resolve, reject) => {
      this.waitTranslateList.push({ text, resolve, reject })
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
      if (item) i.resolve(item.en)
      return !item
    })

    const maxlen = 100

    if (texts.length > maxlen) {
      console.log(`共 ${texts.length} 条数据，分 ${Math.ceil(texts.length / maxlen)} 批翻译`)
      const textsList = this.cutArray(texts, maxlen)
      const proms = textsList.map(async (t, index) => {
        console.log(`正在翻译第 ${index + 1} 批数据，共 ${t.length} 条`)
        await this.onTranslate(t, fixText)
      })
      await Promise.all(proms)
      console.log('翻译完成')
    } else {
      if (texts.length > 0) console.log(`正在翻译共翻译 ${texts.length} 条数据`)
      await this.onTranslate(texts, fixText)
      if (texts.length > 0) console.log('翻译完成')
    }

    this.waitTranslateList = []
  }
}
