import Schemas from './schemas'
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
  schemas: Record<string, Schemas> = {}
  parameters: Record<string, Parameters> = {}

  constructor(private baseDate: OpenAPIV3.ComponentsObject) {
    // 先创建对象再处理数据， 方便打通类型之间的互相引用。
    this.createsObj()
    this.formatCode()
  }

  private createsObj() {
    const { schemas = {}, parameters = {} } = this.baseDate

    Object.entries(schemas).forEach(([k, v]) => {
      this.schemas[k] = new Schemas(this, k, v as any)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      this.parameters[k] = new Parameters(this, k, [v] as any[])
    })
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
