import _ from 'lodash'
import axios from 'axios'
import DocApi from './docApi'
import { checkName } from './common/utils'
import type { OpenAPIV3 } from 'openapi-types'
import Translate, { DictList } from './common/translate'

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
    if (!text.split('').some(isChinese)) return
    if (!tag) {
      const tagItem = { subjects: [subject], text, textEn: '' }
      tagsList.push(tagItem)

      let textEn = await t.addTranslate(text)
      textEn = checkName(textEn, name => tagsList.some(i => i.textEn === name))
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
      texts.map(async text => {
        await addTranslate(text, subject)
      })
    } else if (key === 'tags' && subject !== data && Array.isArray(value) && value.length > 0) {
      translateTagNames({ t, tags: value, subject: subject as any, data })
    }
  }

  deepForEach(data, (value: any, key: string, subject: any) => {
    if (key === 'originalRef' || key === 'tags') {
      promsList.push(forEachProm(value, key, subject))
    }
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
            reject('swagger2.0 to openapi3.0 error')
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
