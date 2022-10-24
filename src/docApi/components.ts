import Schemas from './schemas'
import { PathItem } from './index'
import Parameters, { ParametersData } from './parameters'
import type { OpenAPIV3 } from 'openapi-types'

export class ComponentsBase {
  findRef(ref: string): { model: keyof OpenAPIV3.ComponentsObject; typeName: string } | undefined {
    if (!/^(#\/components\/)/.test(ref)) return
    const [model, typeName] = ref.replace(RegExp.$1, '').split('/')
    return { model, typeName } as any
  }
}

export default class Components {
  // components!: OpenAPIV3.ComponentsObject
  schemas: Record<string, Schemas> = {}
  parameters: Record<string, Parameters> = {}

  constructor(private baseDate: OpenAPIV3.Document, private pathItems: PathItem[]) {
    // const { components, paths } = baseDate
    // this.components = components ?? {}
    // 先创建对象再处理数据， 方便打通类型之间的互相引用。
    this.createsObj()
    this.createsPathType()
    this.formatCode()
  }

  private createsObj() {
    const { schemas = {}, parameters = {} } = this.baseDate.components ?? {}

    Object.entries(schemas).forEach(([k, v]) => {
      this.schemas[k] = new Schemas(this, k, v as any)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      this.parameters[k] = new Parameters(this, k, [v] as any[])
    })
  }

  private createsPathType() {
    for (const { item, name } of this.pathItems) {
      console.log(item)
      const { parameters, responses, requestBody, operationId } = item
      const { description, content = {} } = responses['200'] as OpenAPIV3.ResponseObject

      // FIXME 目前只取第一个， 当一个响应匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
      const [media, mediaType] = Object.entries(content)

      // for (const [media, mediaType ] of Object.entries(content)) {
      //   // const
      // }

      if (parameters) {
        this.parameters[name] = new Parameters(this, name, parameters)
      }
    }
    // const { paths } = Object.values(this.baseDate.paths).forEach(pathValue => {
    //   console.log(pathValue.);
    //   // Object.values(pathValue).forEach()
    // })
  }

  private formatCode() {
    Object.values(this.schemas).forEach(obj => {
      obj.init()
    })

    Object.values(this.parameters).forEach(obj => {
      obj.init()
    })
  }

  addParameters(name: string, datas: OpenAPIV3.OperationObject['parameters']) {
    // if (condition) {

    // }
    this.parameters[name] = new Parameters(this, name, datas as any)
  }
}
