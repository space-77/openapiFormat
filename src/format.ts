import _ from 'lodash'
import axios from 'axios'
import DocApi from './docApi'
import converter from 'do-swagger2openapi'
import { jsonrepair } from 'jsonrepair'
import type { OpenAPIV3 } from 'openapi-types'
import { warnList, errorList } from './store/index'
import { checkName, fixStartNum, isChinese, isWord } from './common/utils'
import Translate, { DictList, TranslateType } from './common/translate'
import type { Dict } from './types/index'

const isKeyword = require('is-es2016-keyword')
const deepForEach = require('deep-for-each')

const tagType = 'tag'
const fixNames = ['Interface', 'module']

type Subject = { $ref: string; title?: string; tags?: string[] }
type ApiData = { json: OpenAPIV3.Document; dictList: DictList[] }
type RevertChineseRef = { name: string; ref: string; subjects: any[]; key: string }
type TextList = { subjects: Subject[]; text: string; translateProm: Promise<string>; textEn?: string }
type TagsList = { subjects: { tags: string[] }[]; text: string; textEn?: string; translateProm: Promise<string> }

const tagsTranslateList: TagsList[] = []
type TagNamesOp = { itemTags: string[]; subject: { tags: string[] }; t: Translate; data: OpenAPIV3.Document }
function translateTagNames(options: TagNamesOp) {
  const { itemTags, subject, t, data } = options

  if (!Array.isArray(data.tags)) data.tags = []
  const { tags: rootTag } = data

  async function onTranslate(tagText: string, index: number) {
    let tagTextEn = tagText
    const tItem = tagsTranslateList.find(i => i.text === tagText)
    if (!tItem) {
      const translateProm = t.addTranslate(tagText)
      const newTItem: TagsList = { translateProm, text: tagText, subjects: [subject] }

      tagsTranslateList.push(newTItem)
      tagTextEn = await translateProm
      tagTextEn = Translate.startCaseClassName(tagTextEn, t.type, 3)

      tagTextEn = checkName(tagTextEn, n => !!rootTag.find(i => i.name === n))
      newTItem.textEn = tagTextEn

      newTItem.subjects.forEach(obj => {
        obj.tags[index] = tagTextEn
      })
    } else {
      tItem.subjects.push(subject)
      await tItem.translateProm
      tagTextEn = tItem.textEn as string
    }
    return tagTextEn
  }

  itemTags.forEach(async (tagText, index) => {
    const rootTagInfo = rootTag.find(i => i.name === tagText)
    if (rootTagInfo) {
      if (!tagText.split('').some(isChinese)) return // 正常数据，返回
      // 需要翻译
      if (rootTagInfo.description?.split('').some(isChinese) || !rootTagInfo.description) {
        // const tagTextEn = await onTranslate(tagText, index)
        rootTagInfo.name = await onTranslate(tagText, index)
        if (!rootTagInfo.description) rootTagInfo.description = tagText
      }
    } else {
      // 根目录没有对应的 tag 需要添加
      let name = tagText
      if (tagText.split('').some(isChinese)) {
        // 需要翻译
        name = await onTranslate(tagText, index)
      }
      rootTag.push({ name, description: name })
    }
  })
}

function fixTagName(textEn: string, type?: string) {
  if (type !== tagType) return textEn.trim()
  const nameList = _.startCase(textEn).split(' ')
  if (nameList.length > 1) {
    textEn = textEn.replace(new RegExp(`(${fixNames.join('|')})$`, 'i'), '')
  }
  if (isKeyword(textEn)) textEn = `m${_.toUpper(textEn)}`
  return textEn.trim()
}

/**
 * @param data OpenApi3.x json
 * @param dictList cache translation
 * @param translateType
 * @description OpenApi3.x 数据翻译
 */
async function translateV3(data: OpenAPIV3.Document, dictList: DictList[], translateType = TranslateType.english) {
  if (translateType === TranslateType.none) return { data, dictList }

  const t = new Translate(dictList, translateType)
  const textList: TextList[] = []

  deepForEach(data, async (value: any, key: string, subject: any) => {
    if (key === '$ref' && typeof value === 'string') {
      const [, , typeInfoKey, refNname] = value.split('/')
      let textEn = ''
      if (refNname.split('').some(isChinese)) {
        const item = textList.find(i => i.text === refNname)

        if (!item) {
          const translateProm = t.addTranslate(refNname)
          const newItem: TextList = { text: refNname, subjects: [subject], translateProm: translateProm }
          textList.push(newItem)
          textEn = await translateProm
          textEn = fixStartNum(textEn)
          newItem.textEn = checkName(textEn, n => !!textList.find(i => i.textEn === n))

          if (newItem.textEn !== textEn) {
            const dict = dictList.find(i => i.zh === refNname)
            if (dict) dict.en = newItem.textEn
          }

          newItem.subjects.forEach(i => {
            i.$ref = i.$ref.replace(refNname, newItem.textEn!)
          })
        } else {
          item.subjects.push(subject)
          await item.translateProm
        }
      }
      const _data = data as any
      const newRef = value.replace(refNname, textEn)
      if (newRef !== value && _data[typeInfoKey] && _data[typeInfoKey][newRef] === undefined) {
        _data[typeInfoKey][newRef] = _data[typeInfoKey][refNname]
        delete _data[typeInfoKey][refNname]
      }
    } else if (key === 'tags' && (subject as any) !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, itemTags: value, subject: subject as any, data })
    } else if (key === 'operationId') {
      // 处理 方法名带下横杠
      subject.operationId = Translate.startCaseClassName(value, translateType)
    }
  })

  await t.translate(fixTagName)
  if (data.components) {
    // 这里是处理没有被引用但key包含了中文的 components 的翻译，不处理应该也没事
    Object.values(data.components).forEach(moduleValue => {
      Object.entries(moduleValue).forEach(async ([key, value]) => {
        if (key.split('').some(isChinese)) {
          let textEn = await t.addTranslate(key)
          textEn = fixStartNum(textEn)
          textEn = checkName(textEn, n => moduleValue[n] !== undefined)
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

function formatV3Name(data: any) {
  const refs: RevertChineseRef[] = []
  deepForEach(data, (value: any, key: string, subject: any) => {
    if (key === '$ref') {
      // #/components/schemas/TongYongXiangYingTi_List_YueDuLingShouJi
      const [, , , refName] = (value as string).split('/')
      const text = fixStartNum(refName.split('').filter(isWord).join(''))

      if (text === refName) return
      const refItem = refs.find(i => i.ref === value)

      if (!refItem) refs.push({ ref: value, name: text, key, subjects: [subject] })
      else refItem.subjects.push(subject)
    }
  })

  refs.forEach(({ name, key, ref, subjects }) => {
    const [, onePath, towPath, refName] = ref.split('/')

    const refPreData = data?.[onePath]?.[towPath]
    if (!refPreData) return
    name = checkName(name, n => refPreData[n] !== undefined)
    const refData = refPreData[refName]
    if (refData) {
      refPreData[name] = refData
      delete refPreData[refName]
    } else throw new Error(`数据异常 ${ref} 引用数据不存在`)

    subjects.forEach(subject => {
      subject[key] = subject[key] = `#/${onePath}/${towPath}/${name}`
    })
  })
}

/**
 * @desc 修复 swagger 转openAPI后变量名字太长问题
 */
function formatOpenapi3Name(json: any) {
  const refs: RevertChineseRef[] = []

  const { components } = json
  if (!components) return

  deepForEach(json, (value: any, key: string, subject: any) => {
    if (key === '$ref') {
      // #/components/schemas/TongYongXiangYingTi_List_YueDuLingShouJi
      // 先收集后统一处理

      const [, , , typeName] = (value as string).split('/')

      // [TongYongXiangYingTi,List,YueDuLingShouJi]
      const nameList = typeName.replace(/_$/, '').split('_')
      if (nameList.length < 2) return
      const firstName = nameList[nameList.length - 1] // YueDuLingShouJi
      const secondName = nameList[nameList.length - 2] // List

      const refItem = refs.find(i => i.ref === value)
      if (!refItem) {
        refs.push({ name: fixStartNum(`${secondName}${firstName}`), key, ref: value, subjects: [subject] })
      } else {
        refItem.subjects.push(subject)
      }
    }
  })

  revertChinese(json, refs)
}

/**
 * @param json openapi3
 * @description 还原成中文
 */
function revertChinese(json: any, refs: RevertChineseRef[]) {
  refs.forEach(({ name, ref, key, subjects }) => {
    const [, onePath, towPath, refName] = ref.split('/')
    let text = fixStartNum(name.split('').filter(isWord).join(''))

    let refPreData = json?.[onePath]?.[towPath]
    if (!refPreData) return
    text = checkName(text, name => refPreData[name] !== undefined)
    const data = refPreData[refName]
    if (data) {
      refPreData[text] = data
      delete refPreData[refName]
    } else {
      throw new Error(`[还原中文]: 数据异常 ${ref} 引用数据不存在`)
    }

    subjects.forEach(subject => {
      subject[key] = `#/${onePath}/${towPath}/${text}`
    })
  })
}

function convert(data: any) {
  return new Promise((resolve, reject) => {
    converter.convertObj(data, { components: true }, (err, options) => {
      if (err) return reject(err.message ?? 'swagger2 to openapi3 error')
      const { convertMessage, openapi } = options
      warnList.push(...(convertMessage?.warnList ?? []))
      errorList.push(...(convertMessage?.errorList ?? []))
      resolve(openapi)
    })
  })
}

async function getApiData(url: string | object, dictList: DictList[], translateType?: TranslateType) {
  return new Promise<ApiData>(async (resolve, reject) => {
    try {
      let data: any = null
      if (_.isObject(url)) {
        data = url
      } else {
        const { data: _data } = await axios.get(url)
        if (typeof _data === 'string') {
          try {
            // 修复 JSON 格式异常【可能修复失败】
            data = JSON.parse(jsonrepair(_data))
          } catch (error) {
            errorList.push({ msg: `${url}: The data format is abnormal (not the standard JSON format)` })
            throw new Error(`${url}: The data format is abnormal (not the standard JSON format)`)
          }
        } else {
          data = _data
        }
      }

      // swagger2.x 转换openapi 3
      const isSwagger = /^2\.\d+/.test(data.swagger)
      if (isSwagger) {
        data = await convert(data)
        formatOpenapi3Name(data)
      }

      if (/^3\.\d+\.\d+$/.test(data.openapi)) {
        if (!isSwagger) formatV3Name(data)
        const { dictList: newDictList } = await translateV3(data, dictList, translateType)
        resolve({ json: data, dictList: newDictList })
      } else {
        errorList.push({ msg: `Not swagger's JSON` })
        throw new Error("Not swagger's JSON")
      }
    } catch (error) {
      reject(error)
    }
  })
}

function getAllOperationId(paths: OpenAPIV3.PathsObject<{}, {}>) {
  // const { paths } = json
  const idMap = new Map<string, { method: string; apiPath: string; info: OpenAPIV3.OperationObject }>()
  Object.entries(paths).forEach(([apiPath, value]) => {
    if (!value) return
    Object.entries(value).forEach(([method, info]) => {
      if (typeof info === 'object' && !Array.isArray(info) && info.operationId) {
        idMap.set(info.operationId, { method, apiPath, info })
      }
    })
  })

  return idMap
}

function restoreCache({ json }: ApiData, cache: Dict['cache']) {
  if (!cache) return
  const { paths } = json

  const idMap = getAllOperationId(paths)

  Object.entries(paths).forEach(([apiPath, methodsObj]) => {
    if (!methodsObj) return
    Object.entries(methodsObj).forEach(([method, info]) => {
      if (!info) return
      const { idNames } = cache
      const cacheKey = `${method}_${apiPath}`
      if (typeof info === 'object' && !Array.isArray(info)) {
        if (cacheKey in cache) {
          // cache 存在对应数据
          const id = info.operationId
          if (!id) return

          let cacheId = idNames[cacheKey]
          if (cacheId === id) return

          // 还原旧信息
          info.operationId = cacheId
          
          const oldInfo = idMap.get(cacheId)
          if (oldInfo) {
            // 旧id是否被使用
            const { method, apiPath, info: newMetInfo } = oldInfo
            const newId = checkName(cacheId, n => !!idMap.get(n))
            newMetInfo.operationId = newId
            idMap.set(newId, oldInfo) // 修改和原id相同的信息
            idNames[`${method}_${apiPath}`] = newId
          }
          idMap.set(cacheId, { method, apiPath, info }) // 修改 原id信息
        } else if (info.operationId) {
          // cache 不存在对应数据
          idNames[cacheKey] = info.operationId
        }
      }
    })
  })
}

type Options = { translateType?: TranslateType }
export default async function (url: string | object, dict?: Dict, options?: Options) {
  const { translateType } = options ?? {}
  const { dict: dictList = [] } = dict ?? {}
  try {
    const res = await getApiData(url, dictList, translateType)

    if (dict) {
      if (!dict.cache) dict.cache = { idNames: {}, returnTypeNames: {}, requestTypeNames: {} }
      restoreCache(res, dict.cache)
    }

    const docApi = new DocApi(res.json)
    await docApi.init()
    return { docApi, dictList: res.dictList, warnList, errorList, cache: dict!.cache }
  } catch (error) {
    return Promise.reject(error)
  }
}
