import { PathItem } from './index'
import Schemas from './components/schemas'
import Responses from './components/Responses'
import Parameters from './components/parameters'
import RequestBodies from './components/requestBodies'
import { firstToUpper } from '../common/utils'
import ComponentsBase from './components/base'
import Custom, { CustomObject } from './components/custom'
import type { Document, ResponseObject } from '../types/openapi'

export type ModuleName = 'schemas' | 'responses' | 'parameters' | 'requestBodies' | 'custom'
export type TypeInfoItem = { typeName: string; moduleName: ModuleName; typeInfo: ComponentsBase }

export default class Components {
  // components!: OpenAPIV3.ComponentsObject
  // schemas: Record<string, Schemas> = {}
  // responses: Record<string, Responses> = {}
  // parameters: Record<string, Parameters> = {}
  // requestBodies: Record<string, RequestBodies> = {}

  // // TODO 一下数据没处理
  // links: Record<string, ComponentsBase> = {}
  // headers: Record<string, ComponentsBase> = {}
  // examples: Record<string, ComponentsBase> = {}
  // callbacks: Record<string, ComponentsBase> = {}
  // securitySchemes: Record<string, ComponentsBase> = {}
  typeInfoList: TypeInfoItem[] = []

  constructor(private baseDate: Document, private pathItems: PathItem[]) {
    // 先创建对象再处理数据， 方便打通类型之间的互相引用。
    this.createsObj()
    this.createsPathType()
    this.formatCode()
  }

  checkName(name: string) {
    // FIXME 翻译，回调
    const hasName = this.typeInfoList.some(i => i.typeName === name)
    const lastNumReg = /((?!0)\d+)$/

    if (hasName) {
      if (!lastNumReg.test(name)) return `${name}1`
      return name.replace(lastNumReg, $1 => `${Number($1) + 1}`)
    }
    return name
  }

  pushTypeItem(moduleName: ModuleName, typeInfo: ComponentsBase) {
    this.typeInfoList.push({ typeName: typeInfo.typeName, moduleName, typeInfo })
  }

  private createsObj() {
    const { schemas = {}, parameters = {}, requestBodies = {}, responses = {} } = this.baseDate.components ?? {}

    Object.entries(schemas).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      const typeItem = new Schemas(this, typeName, v as any)
      this.pushTypeItem('schemas', typeItem)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      const typeItem = new Parameters(this, typeName, [v] as any[])
      this.pushTypeItem('parameters', typeItem)
    })

    Object.entries(requestBodies).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      const typeItem = new RequestBodies(this, typeName, v)
      this.pushTypeItem('requestBodies', typeItem)
    })

    Object.entries(responses).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      const typeItem = new Responses(this, typeName, v)
      this.pushTypeItem('responses', typeItem)
    })
  }

  private createsPathType() {
    for (const pathItem of this.pathItems) {
      const { item, name, bodyName, paramsName, responseName } = pathItem

      const { parameters, responses, requestBody, operationId } = item
      const { description, content = {} } = (responses['200'] as ResponseObject) ?? {}

      // FIXME 目前只取第一个， 当一个响应匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
      const [responseInfo] = Object.entries(content).sort(([a], [b]) => b.length - a.length)
      if (responseInfo) {
        const [media, { schema, example, examples, encoding }] = responseInfo
        if (schema) {
          const response = new Schemas(this, responseName, schema, media)
          this.pushTypeItem('schemas', response)
          pathItem.responseType = response
        }
      }
      if (parameters) {
        const parameter = new Parameters(this, paramsName, parameters)
        this.pushTypeItem('parameters', parameter)
        pathItem.parameterType = parameter
      }

      if (requestBody) {
        const requestBodies = new RequestBodies(this, bodyName, requestBody)
        this.pushTypeItem('requestBodies', requestBodies)
        pathItem.requestBodyType = requestBodies
      }
    }
  }

  private formatCode() {
    this.typeInfoList.forEach(i => {
      i.typeInfo.init()
    })
  }

  addCustomType(name: string, types: CustomObject[]) {
    const typeInfo = new Custom(this, name, types)
    this.pushTypeItem('custom', typeInfo)
    return typeInfo
  }
}
