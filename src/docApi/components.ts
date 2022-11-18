import { PathItem } from './index'
import Schemas from './components/schemas'
import Responses from './components/Responses'
import Parameters from './components/parameters'
import RequestBodies from './components/requestBodies'
import { ComponentsChildBase } from './type'
import type { Document, ResponseObject, OperationObject } from '../types/openapi'
import { firstToUpper } from '../common/utils'

export default class Components {
  // components!: OpenAPIV3.ComponentsObject
  schemas: Record<string, Schemas> = {}
  responses: Record<string, Responses> = {}
  parameters: Record<string, Parameters> = {}
  requestBodies: Record<string, RequestBodies> = {}

  // TODO 一下数据没处理
  links: Record<string, ComponentsChildBase> = {}
  headers: Record<string, ComponentsChildBase> = {}
  examples: Record<string, ComponentsChildBase> = {}
  callbacks: Record<string, ComponentsChildBase> = {}
  securitySchemes: Record<string, ComponentsChildBase> = {}

  get typeList(): [string, ComponentsChildBase][] {
    const { schemas, responses, parameters, requestBodies } = this
    return [
      ...Object.entries(schemas),
      ...Object.entries(responses),
      ...Object.entries(parameters),
      ...Object.entries(requestBodies)
    ] // .map(([typeName, typeInfo]) => ['', typeInfo])
  }

  constructor(private baseDate: Document, private pathItems: PathItem[]) {
    // const { components, paths } = baseDate
    // this.components = components ?? {}
    // 先创建对象再处理数据， 方便打通类型之间的互相引用。
    this.createsObj()
    this.createsPathType()
    this.formatCode()
  }

  private createsObj() {
    const { schemas = {}, parameters = {}, requestBodies = {}, responses = {} } = this.baseDate.components ?? {}

    Object.entries(schemas).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      this.schemas[typeName] = new Schemas(this, typeName, v as any)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      this.parameters[typeName] = new Parameters(this, typeName, [v] as any[])
    })

    Object.entries(requestBodies).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      this.requestBodies[typeName] = new RequestBodies(this, typeName, v)
    })

    Object.entries(responses).forEach(([k, v]) => {
      const typeName = firstToUpper(k)
      this.responses[typeName] = new Responses(this, typeName, v)
    })
  }

  private createsPathType() {
    for (const pathItem of this.pathItems) {
      const { item, name } = pathItem
      const typeName = firstToUpper(name)

      const { parameters, responses, requestBody, operationId } = item
      const { description, content = {} } = (responses['200'] as ResponseObject) ?? {}

      // FIXME 目前只取第一个， 当一个响应匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
      const [responseInfo] = Object.entries(content).sort(([a], [b]) => b.length - a.length)
      if (responseInfo) {
        const [media, { schema, example, examples, encoding }] = responseInfo
        if (schema) {
          // const typeName = `${name}Responses`
          const response = new Schemas(this, typeName, schema)
          this.schemas[typeName] = response
          pathItem.responseType = response
          // TODO 返回数据的 content-type
          // console.log(media)
        }
      }
      if (parameters) {
        const parameter = new Parameters(this, typeName, parameters)
        this.parameters[typeName] = parameter
        pathItem.parameterType = parameter
      }

      if (requestBody) {
        const requestBodies = new RequestBodies(this, typeName, requestBody)
        this.requestBodies[typeName] = requestBodies
        pathItem.requestBodyType = requestBodies
      }
    }
  }

  private formatCode() {
    Object.values(this.schemas).forEach(obj => {
      obj.init()
    })

    Object.values(this.parameters).forEach(obj => {
      obj.init()
    })
  }

  addParameters(name: string, datas: OperationObject['parameters']) {
    this.parameters[name] = new Parameters(this, name, datas as any)
  }
}
