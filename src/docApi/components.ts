import { PathItem } from './index'
import Schemas from './components/schemas'
import Responses from './components/Responses'
import Parameters from './components/parameters'
import RequestBodies from './components/requestBodies'
import { ComponentsChildBase } from './type'
import type { Document, ResponseObject, OperationObject } from '../types/openapi'

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
      this.schemas[k] = new Schemas(this, k, v as any)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      this.parameters[k] = new Parameters(this, k, [v] as any[])
    })

    Object.entries(requestBodies).forEach(([k, v]) => {
      this.requestBodies[k] = new RequestBodies(this, k, v)
    })

    Object.entries(responses).forEach(([k, v]) => {
      this.responses[k] = new Responses(this, k, v)
    })
  }

  private createsPathType() {
    for (const pathItem of this.pathItems) {
      const { item, name } = pathItem
      const { parameters, responses, requestBody, operationId } = item
      const { description, content = {} } = responses['200'] as ResponseObject

      // FIXME 目前只取第一个， 当一个响应匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
      const [[media, { schema, example, examples, encoding }]] = Object.entries(content).sort(
        ([a], [b]) => b.length - a.length
      )
      if (schema) {
        // const typeName = `${name}Responses`
        const response = new Schemas(this, name, schema)
        this.schemas[name] = response
        pathItem.responseType = response
        // TODO 返回数据的 content-type
        // console.log(media)
      }
      if (parameters) {
        const parameter = new Parameters(this, name, parameters)
        this.parameters[name] = parameter
        pathItem.parameterType = parameter
      }

      if (requestBody) {
        const requestBodies = new RequestBodies(this, name, requestBody)
        this.requestBodies[name] = requestBodies
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
