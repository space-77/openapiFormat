import _ from 'lodash'
import axios from 'axios'
import DocApi from './docApi'
import { checkName } from './common/utils'
import type { OpenAPIV3 } from 'openapi-types'
import Translate, { DictList } from './common/translate'

const isChinese = require('is-chinese')
const converter = require('swagger2openapi')
const deepForEach = require('deep-for-each')

const tagType = 'tag'
const fixNames = ['Interface', 'module']

type Subject = { originalRef: string; $ref: string; title?: string; tags?: string[] }
type TextList = { subjects: Subject[]; text: string; translateProm: Promise<string>; textEn?: string }
type TagsList = { subjects: { tags: string[] }[]; text: string; textEn?: string }

const tagsList: TagsList[] = []
type TagNamesOp = { tags: string[]; subject: { tags: string[] }; t: Translate; data: OpenAPIV3.Document }
function translateTagNames(options: TagNamesOp) {
  const { tags, subject, t, data } = options
  const { tags: tagList = [] } = data

  tags.map(async text => {
    const tag = tagsList.find(i => i.text === text)
    if (!text.split('').some(isChinese)) {
      // 英文
      const tagInfo = data.tags?.find(i => i.name === text)

      // 如果 openapi.tags 没找到对应的tag,则需要添加
      if (!tagInfo) {
        if (!Array.isArray(data.tags)) data.tags = []
        data.tags.push({ name: text, description: text })
      }

      // 模块名为英文，不需要翻译
      return
    }
    if (!tag) {
      const tagItem = { subjects: [subject], text, textEn: '' }
      tagsList.push(tagItem)

      let textEn = await t.addTranslate(text, tagType)
      textEn = checkName(textEn, name => tagsList.some(i => i.textEn === name))

      const tagInfo = tagList.find(tag => tag.name === text)
      if (!tagInfo) {
        if (!Array.isArray(data.tags)) data.tags = []
        // 可能存在英文名字，需要检查一下
        textEn = checkName(textEn, n => !!data.tags!.find(i => i.name === n))
        const tag = { name: textEn, description: text }
        data.tags.push(tag)
      } else {
        tagInfo.name = textEn
        tagInfo.description = text
      }

      tagItem.subjects.forEach(subject => {
        const index = subject.tags.findIndex(i => i === text)
        if (index > -1) subject.tags[index] = textEn // 替换原有的 tag 名称
      })

      tagItem.textEn = textEn
    } else {
      tag.subjects.push(subject as any)
    }
  })
}

function fixTagName(textEn: string, type?: string) {
  if (type !== tagType) return textEn.trim()
  const nameList = _.startCase(textEn).split(' ')
  if (nameList.length > 1) {
    textEn = textEn.replace(new RegExp(`(${fixNames.join('|')})$`, 'i'), '')
  }
  return textEn.trim()
}

async function translate(data: any, dictList: DictList[]) {
  const t = new Translate(dictList)
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
        i.originalRef = i.originalRef.replace(text, textEn)
      })
    } else {
      item.subjects.push(subject)
      textEn = await item.translateProm
    }

    return textEn
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
      translateTagNames({ t, tags: value, subject: subject as any, data })
    }
  }

  deepForEach(data, (value: any, key: string, subject: any) => {
    if (key === 'originalRef' || key === 'tags') {
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

async function translateV3(data: OpenAPIV3.Document, dictList: DictList[]) {
  const t = new Translate(dictList)
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
      translateTagNames({ t, tags: value, subject: subject as any, data })
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
        const schema = { originalRef: name, $ref: `#/definitions/${name}` }
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
        fixConvertErr(data)
        const { dictList: newDictList } = await translate(data, dictList)
        converter.convertObj(data, { components: true }, function (err: any, options: any) {
          if (err) {
            reject(err?.message ?? 'swagger2.0 to openapi3.0 error')
            return
          }
          const json = options.openapi as OpenAPIV3.Document
          formatOpenapi3Name(json)
          resolve({ json, dictList: newDictList })
        })
      } else {
        const { dictList: newDictList } = await translateV3(data, dictList)
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
