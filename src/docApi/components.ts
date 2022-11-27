import { PathItem } from './index'
import Schemas, { SchemasOp } from './components/schemas'
import Responses from './components/Responses'
import Parameters, { ParametersOp } from './components/parameters'
import RequestBodies, { RequestBodiesOp } from './components/requestBodies'
import { checkName, firstToUpper } from '../common/utils'
import TypeInfoBase from './components/base'
import Custom, { CustomObject, CustomOp } from './components/custom'
import type { Document, ResponseObject } from '../types/openapi'

export type ModuleName = 'schemas' | 'responses' | 'parameters' | 'requestBodies' | 'custom'
export type TypeInfoItem = { typeName: string; moduleName: ModuleName; typeInfo: TypeInfoBase }

export default class Components {
  // components!: OpenAPIV3.ComponentsObject
  // schemas: Record<string, Schemas> = {}
  // responses: Record<string, Responses> = {}
  // parameters: Record<string, Parameters> = {}
  // requestBodies: Record<string, RequestBodies> = {}

  // // TODO 一下数据没处理
  // links: Record<string, TypeInfoBase> = {}
  // headers: Record<string, TypeInfoBase> = {}
  // examples: Record<string, TypeInfoBase> = {}
  // callbacks: Record<string, TypeInfoBase> = {}
  // securitySchemes: Record<string, TypeInfoBase> = {}
  typeInfoList: TypeInfoItem[] = []

  constructor(private baseDate: Document, private pathItems: PathItem[]) {
    // 先创建对象再处理数据， 方便打通类型之间的互相引用。
    this.createsObj()
    this.createsPathType()
    this.formatCode()
  }

  checkName(name: string): string {
    return checkName(name, checkName => this.typeInfoList.some(i => i.typeName === checkName))
    // const hasName = this.typeInfoList.some(i => i.typeName === name)
    // const lastNumReg = /((?!0)\d+)$/

    // if (hasName) {
    //   let newName = ''
    //   if (!lastNumReg.test(name)) {
    //     newName = `${name}1`
    //   } else {
    //     newName = name.replace(lastNumReg, $1 => `${Number($1) + 1}`)
    //   }
    //   return this.checkName(newName)
    // }
    // return name
  }

  pushTypeItem(typeInfo: TypeInfoBase) {
    this.typeInfoList.push({ typeName: typeInfo.typeName, moduleName: typeInfo.moduleName, typeInfo })
  }

  private createsObj() {
    const { schemas = {}, parameters = {}, requestBodies = {}, responses = {} } = this.baseDate.components ?? {}

    Object.entries(schemas).forEach(([k, data]) => {
      const typeName = firstToUpper(k)
      const option: SchemasOp = { parent: this, name: typeName, data, moduleName: 'schemas' }
      const typeItem = new Schemas(option)
      this.pushTypeItem(typeItem)
    })

    Object.entries(parameters).forEach(([k, data]) => {
      const typeName = firstToUpper(k)
      const option: ParametersOp = { parent: this, name: typeName, datas: [data], moduleName: 'parameters' }
      const typeItem = new Parameters(option)
      this.pushTypeItem(typeItem)
    })

    Object.entries(requestBodies).forEach(([k, data]) => {
      const typeName = firstToUpper(k)
      const option: RequestBodiesOp = { parent: this, name: typeName, data, moduleName: 'requestBodies' }
      const typeItem = new RequestBodies(option)
      this.pushTypeItem(typeItem)
    })

    Object.entries(responses).forEach(([k, data]) => {
      const typeName = firstToUpper(k)
      const option: RequestBodiesOp = { parent: this, name: typeName, data, moduleName: 'responses' }
      const typeItem = new Responses(option)
      this.pushTypeItem(typeItem)
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
          const option: SchemasOp = {
            parent: this,
            data: schema,
            name: responseName,
            moduleName: 'schemas',
            resConentType: media
          }
          const response = new Schemas(option)
          this.pushTypeItem(response)
          pathItem.responseType = response
        }
      }
      if (parameters) {
        const option: ParametersOp = { parent: this, name: paramsName, datas: parameters, moduleName: 'parameters' }
        const parameter = new Parameters(option)
        this.pushTypeItem(parameter)
        pathItem.parameterType = parameter
      }

      if (requestBody) {
        const option: RequestBodiesOp = { parent: this, name: bodyName, data: requestBody, moduleName: 'requestBodies' }
        const requestBodies = new RequestBodies(option)
        this.pushTypeItem(requestBodies)
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
    const option: CustomOp = { parent: this, name, datas: types, moduleName: 'custom' }
    const typeInfo = new Custom(option)
    this.pushTypeItem(typeInfo)
    return typeInfo
  }
}
