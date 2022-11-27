import _ from 'lodash'
import { iflyrecTranslator, baiduTranslator, bingTranslator } from 'node-translates'

export type DictList = { zh: string; en: string }
export type WaitTranslate = { resolve: (value: string) => void; reject: (reason?: any) => void; text: string }

export default class Translate {
  private waitTranslateList: WaitTranslate[] = []
  private engines = [iflyrecTranslator, baiduTranslator, bingTranslator]

  constructor(public dictList: DictList[] = []) {}

  private dictHasKey(key: string) {
    return this.dictList.some(i => i.zh === key)
  }

  private startCaseClassName(textEn: string) {
    // 缓存到电脑某个位置的缓存区域
    let wordArray = _.startCase(textEn).split(' ')
    if (wordArray.length > 6) {
      wordArray = [...wordArray.slice(0, 5), ...wordArray.slice(-1)]
    }

    // 处理以数字开头的异常
    return wordArray.join('').replace(/^\d+\S+/, $1 => `N${$1}`)
  }

  private async onTranslate(texts: WaitTranslate[], engineIndex = 0): Promise<DictList[]> {
    if (texts.length === 0) return []
    if (engineIndex >= this.engines.length) {
      const errStr = 'translate error, all translate engine can not access'
      texts.forEach(i => i.reject(errStr))
      throw new Error(errStr)
    }
    try {
      const resList = await this.engines[engineIndex](texts.map(i => i.text))
      resList.forEach((i, index) => {
        i.en = this.startCaseClassName(i.en)
        this.dictList.push(i)
        texts[index].resolve(i.en)
      })
      return resList
    } catch (error) {
      return this.onTranslate(texts, engineIndex + 1)
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

  async translate() {
    // 过滤出没有缓存的中文数据
    const texts = this.waitTranslateList.filter(i => {
      const item = this.dictList.find(j => j.zh === i.text)
      if (item) i.resolve(item.en)
      return !item
    })
    console.log(`正在翻译共翻译 ${texts.length} 条数据`)
    await this.onTranslate(texts)
    this.waitTranslateList = []
  }
}
