import _ from 'lodash'
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

type Subject = { originalRef: string; $ref: string; title?: string; tags?: string[] }
type TextList = { subjects: Subject[]; text: string; textEn?: string }
type TagsList = { subjects: { tags: string[] }[]; text: string; textEn?: string }

const tagsList: TagsList[] = []
type TagNamesOp = { tags: string[]; subject: { tags: string[] }; t: Translate; data: any }
function translateTagNames(options: TagNamesOp) {
  const { tags, subject, t, data } = options
  tags.map(async text => {
    const tag = tagsList.find(i => i.text === text)
    if (!tag) {
      const tagItem = { subjects: [subject], text, textEn: '' }
      tagsList.push(tagItem)
      const textEn = await t.addTranslate(text)
      tagItem.textEn = textEn
      tagItem.subjects.forEach(subject => {
        const index = subject.tags.findIndex(i => i === text)
        if (index > -1) subject.tags[index] = textEn // 替换原有的 tag 名称
        data.tags.forEach((tag: any) => {
          if (tag.name === text) tag.name = textEn
        })
      })
    } else {
      tag.subjects.push(subject as any)
    }
  })
}

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

  function formatStr(value: string) {
    return value
      .replace(/»/g, '')
      .split('«')
      .filter(text => text.split('').some(isChinese))
  }

  async function forEachProm(value: any, key: string, subject: Subject) {
    if (key === 'originalRef') {
      // 切割
      subject.title = value
      const texts = formatStr(value)

      // console.log(value)
      // if (texts.length === 0) {
      //   console.log(value)
      //   return
      // }

      // console.log(texts)

      texts.map(async text => {
        await addTranslate(text, subject)
      })

      // await Promise.all(proms)

      // const { definitions } = data
      // const definition = definitions[value]
      // // if (subject.originalRef === value) {
      // //   console.log(value)
      // // }
      // if (definition) {
      //   // #/definitions/UniversalResponseBody«string»
      //   definitions[subject.originalRef] = definition
      //   delete definitions[value]
      // }
    } else if (key === 'tags' && subject !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, tags: value, subject: subject as any, data })
    }
  }

  deepForEach(data, (value: any, key: string, subject: Subject) => {
    promsList.push(forEachProm(value, key, subject))
  })

  await t.translate()
  await Promise.all(promsList)

  if (data.definitions) {
    Object.entries(data.definitions).forEach(async ([key, value]) => {
      let newKey = key
      const proms = formatStr(key).map(async text => {
        const textEn = await t.addTranslate(text)
        newKey = newKey.replace(text, textEn)
      })
      await Promise.all(proms)

      if (newKey === key) return
      data.definitions[newKey] = value
      delete data.definitions[key]
    })
    await t.translate()
  }

  return { data, dictList: t.dictList }
}

async function translateV3(data: OpenAPIV3.Document, dictList: DictList[]) {
  const t = new Translate(dictList)
  const textEnList = new Set<string>([])

  deepForEach(data, async (value: any, key: string, subject: Subject) => {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/')) {
      const [, , typeInfoKey, refNname] = value.split('/')
      if (refNname.split('').some(isChinese)) {
        let textEn = await t.addTranslate(refNname)
        textEn = checkName(textEn, checkName => textEnList.has(checkName))
        textEnList.add(textEn)
        subject.$ref = subject.$ref.replace(refNname, textEn)
      }
    } else if (key === 'tags' && (subject as any) !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, tags: value, subject: subject as any, data })
    }
    // promsList.push(forEachProm(value, key, subject))
  })

  await t.translate()
  if (data.components) {
    Object.values(data.components).forEach(moduleValue => {
      Object.entries(moduleValue).forEach(async ([key, value]) => {
        if (key.split('').some(isChinese)) {
          const textEn = await t.addTranslate(key)
          if (!moduleValue[textEn]) {
            moduleValue[textEn] = value
            delete moduleValue[key]
          }
        }
      })
    })
    await t.translate()
  }

  return { data, dictList: t.dictList }
}

/**
 * @desc 修复 swagger 转openAPI后变量名字太长问题
 */
function formatOpenapi3Name(json: any) {
  const names = new Set<string>([])
  const textMap: Record<string, any> = {}
  const { components } = json
  if (!components) return

  deepForEach(json, (value: any, key: string, subject: any) => {
    if (key === '$ref') {
      const [, , moduleName, refNname] = value.split('/')

      let newName = Translate.startCaseClassName(refNname)
      if (newName === refNname) return

      const moduleItem = textMap[moduleName]

      if (!moduleItem) {
        newName = checkName(newName, checkName => names.has(checkName))
        names.add(newName)
        textMap[moduleName] = { refNname: newName }
      } else {
        if (moduleItem[refNname]) {
          // 如果模块中已近存在了新名字，则直接使用模块的新名字
          newName = moduleItem[refNname]
        } else {
          newName = checkName(newName, checkName => names.has(checkName))
          names.add(newName)
          moduleItem[refNname] = newName
        }
      }
      subject.$ref = subject.$ref.replace(refNname, newName)
    }
  })

  Object.entries(textMap).forEach(([moduleName, names]) => {
    const moduleItem = components[moduleName]
    if (!moduleItem || !_.isObject(names)) return
    Object.entries(names).forEach(([key, name]) => {
      if (key === name) return
      const moduleValue = moduleItem[key]
      if (moduleValue) {
        moduleItem[name] = moduleValue
        delete moduleItem[key]
      }
    })
  })
}

type ApiData = { json: OpenAPIV3.Document; dictList: DictList[] }
async function getApiData(url: string | object, dictList: DictList[]) {
  return new Promise<ApiData>(async (resolve, reject) => {
    try {
      let data: any = null
      if (_.isObject(url)) {
        data = url
      } else {
        const res = await axios.get(url)
        data = res.data
      }
      if (data.swagger === '2.0') {
        const { dictList: newDictList } = await translate(data, dictList)
        // fs.writeFileSync(path.join(__dirname, '../mock/swagger2.json'), JSON.stringify(data))
        converter.convertObj(data, { components: true }, function (err: any, options: any) {
          if (err) {
            reject('swagger2.0 to openapi3.0 error')
            return
          }
          const json = options.openapi as OpenAPIV3.Document
          formatOpenapi3Name(json)
          // fs.writeFileSync(path.join(__dirname, '../mock/swagger2openapi3.json'), JSON.stringify(options.openapi))
          resolve({ json, dictList: newDictList })
        })
      } else {
        const { dictList: newDictList } = await translateV3(data, dictList)
        // fs.writeFileSync(path.join(__dirname, '../mock/openapi3En.json'), JSON.stringify(data))
        resolve({ json: data, dictList: newDictList })
      }
    } catch (error) {
      reject(error)
    }
  })
}

export default async function (url: string | object, dictList: DictList[] = []) {
  try {
    const res = await getApiData(url, dictList)

    const docApi = new DocApi(res.json)
    await docApi.init()
    return { docApi, dictList: res.dictList }
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
