import fs from 'fs'
import axios from 'axios'
import DocApi from './docApi'
import Translate, { DictList } from './common/translate'
import type { OpenAPIV3 } from 'openapi-types'
import path from 'path'
import { checkName } from './common/utils'

// export DocApi from './docApi'
// import path from 'path'

const dictPath = path.join(__dirname, '../mock/translate.json')
const isChinese = require('is-chinese')
const converter = require('swagger2openapi')
const deepForEach = require('deep-for-each')

type Subject = { originalRef: string; $ref: string; title?: string }
type TextList = { subjects: Subject[]; text: string; textEn?: string }

async function translate(data: any, dictList: DictList[]) {
  const t = new Translate(dictList)
  const textList: TextList[] = []
  const promsList: Promise<any>[] = []

  async function addTranslate(text: string, subject: Subject) {
    const item = textList.find(i => i.text === text)
    if (!item) {
      const newItem: TextList = { subjects: [subject], text: text }
      textList.push(newItem)
      try {
        const textTranslateProm = t.addTranslate(text)
        let textEn = (await textTranslateProm) as string

        // 查重,是否已存在相同的译文：如 你 翻译成 you, 但是 您 也可以翻译成 you
        textEn = checkName(textEn, checkName => textList.some(i => i.text === checkName))

        newItem.textEn = textEn
        newItem.subjects.forEach(i => {
          i.$ref = i.$ref.replace(text, textEn)
          i.originalRef = i.originalRef.replace(text, textEn)
        })
      } catch (error) {}
    } else {
      item.subjects.push(subject)
    }
  }

  async function forEachProm(value: any, key: string, subject: Subject) {
    if (key === 'originalRef') {
      // 切割
      subject.title = value
      const texts = (value as string).replace(/»/g, '').split('«').filter(text => text.split('').some(isChinese))

      if (texts.length === 0) return
      const proms = texts.map(async text => {
        await addTranslate(text, subject)
      })

      await Promise.all(proms)

      const { definitions } = data
      const definition = definitions[value]
      // if (subject.originalRef === value) {
      //   console.log(value)
      // }
      if (definition) {
        definitions[subject.originalRef] = definition
        delete definitions[value]
      }
    }
  }

  deepForEach(data, (value: any, key: string, subject: Subject) => {
    promsList.push(forEachProm(value, key, subject))
  })

  await t.translate()
  await Promise.all(promsList)

  // fs.writeFileSync(dictPath, JSON.stringify(t.dictList, null, 2))

  return { data, dictList: t.dictList }
}

type ApiDataReturn = { json: OpenAPIV3.Document; dictList: DictList[] }
async function getApiData(url: string, dictList: DictList[]) {
  return new Promise<ApiDataReturn>(async (resolve, reject) => {
    try {
      const { data } = await axios.get(url)
      if (data.swagger === '2.0') {
        const { dictList: newDictList } = await translate(data, dictList)
        // fs.writeFileSync(path.join(__dirname, '../mock/swagger2.json'), JSON.stringify(data))
        converter.convertObj(data, { components: true }, function (err: any, options: any) {
          if (err) {
            console.log('error')
            reject(err)
            return
          }
          resolve({ json: options.openapi, dictList: newDictList })
        })
      } else {
        resolve({ json: data, dictList })
      }
    } catch (error) {
      reject(error)
    }
  })
}

export default async function (url: string, dictList: DictList[] = []) {
  try {
    const res = await getApiData(url, dictList)

    const docApi = new DocApi(res.json)
    await docApi.init()
    return res
  } catch (error) {
    return Promise.reject(error)
  }
}

// interface InitOps {
//   buildFuncs: () => void
//   buildTypes: () => void
// }

// export default class OpenApi {
//   // private initDone = false
//   private json!: OpenAPIV3.Document
//   private docData!: DocApi
//   private buildFuncs?: InitOps['buildFuncs']
//   private buildTypes?: InitOps['buildTypes']

//   constructor(private url: string) {
//     this.init()
//   }

//   private async init() {
//     try {
//       await this.getApiData()
//       this.docData = new DocApi(this.json)
//       // this
//       // console.log('99999999999')
//       this.docData.build()
//     } catch (error) {
//       console.error(error)
//     }
//   }

//   private async getApiData() {
//     this.json = require(path.join(__dirname, '../mock/swagger2openapi.json'))
//     // try {
//     //   const { data } = await axios.get<OpenAPIV3.Document>(this.url)
//     //   this.json = data
//     // } catch (error) {
//     //   console.error('获取数据异常')
//     // }
//   }

//   public start({ buildFuncs, buildTypes }: InitOps) {
//     this.buildFuncs = buildFuncs
//     this.buildTypes = buildTypes
//   }
// }
