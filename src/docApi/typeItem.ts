import { OpenAPIV3 } from 'openapi-types'
import { TypeInfoItem } from './components'
import { ComponentsChildBase, GenericsItems } from './type'

export interface TypeItemOption {
  name: string
  type?: string | ComponentsChildBase

  /** 引用其它类型 */
  // ref?: string
  /** 泛型入参 */ // 可能是 字符串， 可能是 引用类型， 可能是 引用类型也是需要入参的
  genericsItem?: string | ComponentsChildBase | TypeItem

  // 参数的位置，
  paramType?: 'query' | 'header' | 'path' | 'body'

  // title?: string
  // format?: string
  default?: string

  enumTypes?: any[]
  required?: boolean
  example?: string
  children?: TypeItemOption[]

  description?: string
  /** 外部链接描叙 */
  externalDocs?: OpenAPIV3.ExternalDocumentationObject

  /** 是否弃用 */
  deprecated?: boolean

  /** 可以为空 */
  nullable?: boolean
}
export default class TypeItem implements TypeItemOption {
  name!: string
  type?: string | ComponentsChildBase //
  example?: string
  default?: string
  required?: boolean
  nullable?: boolean
  children?: TypeItemOption[]
  enumTypes?: any[]
  paramType?: 'query' | 'header' | 'path' | 'body'
  deprecated?: boolean
  description?: string
  genericsItem?: string | ComponentsChildBase | TypeItem
  externalDocs?: OpenAPIV3.ExternalDocumentationObject

  constructor(option: TypeItemOption) {
    const { name, type, example, default: def, required } = option
    const { nullable, children, enumTypes, paramType, deprecated, description, genericsItem, externalDocs } = option
    this.name = name
    this.type = type
    this.default = def
    this.example = example
    this.required = required
    this.nullable = nullable
    this.children = children
    this.enumTypes = enumTypes
    this.paramType = paramType
    this.deprecated = deprecated
    this.description = description
    this.genericsItem = genericsItem
    this.externalDocs = externalDocs
  }
}
