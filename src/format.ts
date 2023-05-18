import _ from 'lodash'
import axios from 'axios'
import DocApi from './docApi'
import { jsonrepair } from 'jsonrepair'
import { checkName, isWord } from './common/utils'
import type { OpenAPIV3 } from 'openapi-types'
import Translate, { DictList, TranslateType } from './common/translate'

const isChinese = require('is-chinese')
const converter = require('swagger2openapi')
const isKeyword = require('is-es2016-keyword')
const deepForEach = require('deep-for-each')

const tagType = 'tag'
const fixNames = ['Interface', 'module']

type Subject = { $ref: string; title?: string; tags?: string[] }
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
      tagTextEn = Translate.startCaseClassName(tagTextEn, 3)

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
  if (isKeyword(textEn)) textEn = `my${_.toUpper(textEn)}`
  return textEn.trim()
}

async function translate(data: any, dictList: DictList[], translateType?: TranslateType) {
  const t = new Translate(dictList, translateType)
  const textList: TextList[] = []
  const promsList: Promise<any>[] = []

  async function addTranslate(text: string, subject: Subject) {
    let textEn = ''
    const item = textList.find(i => i.text === text)
    if (!item) {
      const textTranslateProm = t.addTranslate(text)
      const newItem: TextList = { subjects: [subject], text: text, translateProm: textTranslateProm }
      textList.push(newItem)
      textEn = await textTranslateProm

      // 查重,是否已存在相同的译文：如 你 翻译成 you, 但是 您 也可以翻译成 you
      textEn = checkName(textEn, checkName => textList.some(i => i.text === checkName))

      newItem.textEn = textEn
      newItem.subjects.forEach(i => {
        i.$ref = i.$ref.replace(text, textEn)
        // i.originalRef = i.originalRef.replace(text, textEn)
      })
    } else {
      item.subjects.push(subject)
      textEn = await item.translateProm
    }

    return textEn
  }

  function formatStr(value: string) {
    return value
      .replace(/^#\/definitions\//g, '')
      .replace(/»/g, '')
      .split('«')
      .filter(text => text.split('').some(isChinese))
  }

  async function forEachProm(value: any, key: string, subject: Subject) {
    if (key === '$ref') {
      // 切割
      subject.title = value
      const texts = formatStr(value)

      let newRef: string = value
      const proms = texts.map(async text => {
        const textEn = await addTranslate(text, subject)
        newRef = newRef.replace(text, textEn)
      })

      await Promise.all(proms)

      // 修改包含中文 data.definitions 的 key
      if (data.definitions[value] && data.definitions[newRef] === undefined && value !== newRef) {
        data.definitions[newRef] = data.definitions[value]
        delete data.definitions[value]
      }
    } else if (key === 'tags' && subject !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, itemTags: value, subject: subject as any, data })
    }
  }

  deepForEach(data, (value: any, key: string, subject: any) => {
    if (key === '$ref' || key === 'tags') {
      promsList.push(forEachProm(value, key, subject))
    }
  })

  await t.translate(fixTagName)
  await Promise.all(promsList)

  if (data.definitions) {
    // 这里是处理没有被引用但key包含了中文的 definitions 的翻译，不处理应该也没事
    const proms = Object.entries(data.definitions).map(async ([key, value]) => {
      let newKey = key
      const proms = formatStr(key).map(async text => {
        const textEn = await t.addTranslate(text)
        newKey = newKey.replace(text, textEn)
      })
      await Promise.all(proms)

      if (newKey === key) return
      newKey = checkName(newKey, n => data.definitions[n] !== undefined)
      data.definitions[newKey] = value
      delete data.definitions[key]
    })
    await t.translate()
    await Promise.all(proms)
  }

  return { data, dictList: t.dictList }
}

async function translateV3(data: OpenAPIV3.Document, dictList: DictList[], translateType?: TranslateType) {
  if (translateType === TranslateType.none) {
    // TODO 整理即可
    deepForEach(data, (value: any, key: string, subject: any) => {
      if (key === '$ref') {
        const json = data as any
        const [, onePath, towPath, refName] = (value as string).split('/')
        const text = refName
          .split('')
          .filter(isWord)
          .join('')
          .replace(/^\d+\S+/, $1 => `N${$1}`)

        if (text !== refName) {
          // 有变更，需要修改引用
          subject[key] = `#/${onePath}/${towPath}${text}`
          const item = json[onePath][towPath][refName]
          if (item) {
            if (!json[onePath][towPath][text]) {
              json[onePath][towPath][text] = data
              delete json[onePath][towPath][refName]
            } else {
              throw new Error(`[还原中文]: #/${onePath}/${towPath}/${refName} 数据已存在`)
            }
          }
        }
      }
    })

    return { data, dictList }
  }

  const t = new Translate(dictList, translateType)
  const textList: TextList[] = []

  deepForEach(data, async (value: any, key: string, subject: any) => {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/')) {
      const [, , typeInfoKey, refNname] = value.split('/')
      let textEn = ''
      if (refNname.split('').some(isChinese)) {
        const item = textList.find(i => (i.text = refNname))
        if (!item) {
          const translateProm = t.addTranslate(refNname)
          const newItem: TextList = { text: refNname, subjects: [subject], translateProm: translateProm }
          textList.push(newItem)
          textEn = await translateProm
          newItem.textEn = checkName(textEn, n => !!textList.find(i => (i.textEn = n)))
          newItem.subjects.forEach(i => {
            i.$ref = i.$ref.replace(refNname, textEn)
          })
        } else {
          item.subjects.push(subject)
          textEn = await item.translateProm
        }
      }
      const _data = data as any
      const newRef = value.replace(refNname, textEn)
      if (newRef !== value && _data[typeInfoKey][value] && _data[typeInfoKey][newRef] === undefined) {
        _data[typeInfoKey][newRef] = _data[typeInfoKey][value]
        delete _data[typeInfoKey][value]
      }
    } else if (key === 'tags' && (subject as any) !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, itemTags: value, subject: subject as any, data })
    } else if (key === 'operationId') {
      // 处理 方法名带下横杠
      subject.operationId = Translate.startCaseClassName(value)
    }
  })

  await t.translate(fixTagName)
  if (data.components) {
    // 这里是处理没有被引用但key包含了中文的 components 的翻译，不处理应该也没事
    Object.values(data.components).forEach(moduleValue => {
      Object.entries(moduleValue).forEach(async ([key, value]) => {
        if (key.split('').some(isChinese)) {
          let textEn = await t.addTranslate(key)
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

function fixConvertErr(json: any) {
  deepForEach(json.paths, (value: any, key: string, subject: any) => {
    if (key === 'parameters' && Array.isArray(value)) {
      const bodyParams = value.filter(i => i.in === 'body')
      if (bodyParams.length > 1) {
        // 异常数据
        // 修复异常数据结构

        console.warn(`数据结构异常：${subject.operationId}，parameters里存在${bodyParams.length}个body数据，已修正。`)

        const names = Object.keys(json.definitions)
        const parameters = value.filter(i => i.in !== 'body')
        let name = `M${subject.operationId}Body`
        name = checkName(name, n => names.includes(n))
        const schema = { $ref: `#/definitions/${name}` }
        const bodyRef = { required: true, in: 'body', name, description: name, schema }
        parameters.push(bodyRef)
        subject.parameters = parameters

        // 添加 definition
        const required: string[] = []
        const properties: Record<string, string> = {}
        bodyParams.forEach(i => {
          if (i.required) required.push(i.name)
          properties[i.name] = { ...i.schema, description: i.description }
        })
        const definition = {
          type: 'object',
          required,
          properties,
          title: '报事报修处理记录业务',
          description: '报事报修处理记录业务AddDTO'
        }

        json.definitions[name] = definition
      }
    } else if (key === 'in' && value === 'path') {
      if (!subject.required) {
        console.warn(`路径参数异常 ${subject.name}, path 参数必须为必传， 已修正。`)
        subject.required = true
      }
    }
  })
}

/**
 * @description 还原成中文
 * @param json openapi3
 */
function revertChinese(json: any, dictList: DictList[]) {
  deepForEach(json, (value: any, key: string, subject: any) => {
    if (key === '$ref') {
      // #/components/schemas/xxx
      const [, onePath, towPath, refName] = (value as string).split('/') as any[]
      const { zh } = dictList.find(i => i.en === refName) ?? {}
      if (zh) {
        const text = zh
          .split('')
          .filter(isWord)
          .join('')
          .replace(/^\d+\S+/, $1 => `N${$1}`)
        subject[key] = `#/${onePath}/${towPath}/${text}`

        try {
          const data = json[onePath][towPath][refName]
          if (data) {
            if (!json[onePath][towPath][text]) {
              json[onePath][towPath][text] = data
              delete json[onePath][towPath][refName]
            } else {
              throw new Error(`[还原中文]: #/${onePath}/${towPath}/${refName} 数据已存在`)
            }
          } else {
            // 引用数据已近被改了，或者引用数据不存在
          }
        } catch (error) {
          console.error('[还原中文]：数据引用异常', error)
        }
      }
    }
  })
}

type ApiData = { json: OpenAPIV3.Document; dictList: DictList[] }
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
            data = JSON.parse(jsonrepair(_data))
          } catch (error) {
            throw new Error(`${url}: The data format is abnormal (not the standard JSON format)`)
          }
        } else {
          data = _data
        }
      }

      if (/^2\.\d+/.test(data.swagger)) {
        fixConvertErr(data)
        const { dictList: newDictList } = await translate(data, dictList, translateType)
        converter.convertObj(data, { components: true }, function (err: any, options: any) {
          if (err) {
            reject(err?.message ?? 'swagger2 to openapi3 error')
            return
          }
          const json = options.openapi as OpenAPIV3.Document
          formatOpenapi3Name(json)
          if (translateType === TranslateType.none) revertChinese(json, newDictList)
          resolve({ json, dictList: newDictList })
        })
      } else if (/^3\.\d+/.test(data.swagger)) {
        const { dictList: newDictList } = await translateV3(data, dictList, translateType)
        resolve({ json: data, dictList: newDictList })
      } else {
        throw new Error("Not swagger's JSON")
      }
    } catch (error) {
      reject(error)
    }
  })
}

type Options = { translateType?: TranslateType }
export default async function (url: string | object, dictList: DictList[] = [], options?: Options) {
  const { translateType } = options ?? {}
  try {
    const res = await getApiData(url, dictList, translateType)

    const docApi = new DocApi(res.json)
    await docApi.init()
    return { docApi, dictList: res.dictList }
  } catch (error) {
    return Promise.reject(error)
  }
}
