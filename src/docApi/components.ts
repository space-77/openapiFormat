import Schemas from './schemas'
import Parameters from './parameters'
import type { OpenAPIV3 } from 'openapi-types'

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
      this.schemas[k] = new Schemas(this, v as any)
    })

    Object.entries(parameters).forEach(([k, v]) => {
      this.parameters[k] = new Parameters(this, v as any)
    })
  }

  formatCode() {
    Object.values(this.schemas).forEach(obj => {
      obj.init()
    })

    Object.values(this.parameters).forEach(obj => {
      obj.init()
    })
  }
}

export interface GenericsItems {
  type?: string
  $ref?: string
}

//  OpenAPIV3.BaseSchemaObject
export interface ChildType {
  name: string
  type: string

  /** 引用其它类型 */
  $ref?: string
  /** 泛型入参 */
  genericsItems?: GenericsItems

  // title?: string
  // format?: string
  default?: string

  enumTypes?: string
  required?: boolean
  example?: string
  children?: ChildType[]

  description?: string
  /** 外部链接描叙 */
  externalDocs?: OpenAPIV3.ExternalDocumentationObject

  /** 是否弃用 */
  deprecated?: boolean

  /** 可以为空 */
  nullable?: boolean
}
export interface ComponentsChildBase {
  title?: string
  typeName: string
  description?: string
  externalDocs?: OpenAPIV3.ExternalDocumentationObject

  // Record
  additionalProperties?: boolean | OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject

  types: ChildType[]

  init: () => void
}
