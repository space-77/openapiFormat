import { OpenAPIV3 } from 'openapi-types'
import { ComponentsChildBase, GenericsItems } from './type'

export interface TypeItemOption {
  name: string
  type?: string | ComponentsChildBase

  /** 引用其它类型 */
  $ref?: string
  /** 泛型入参 */ // 可能是 字符串 可能是 引用类型 可能是 引用类型也是需要入参的
  genericsItem?: string |  ComponentsChildBase | TypeItemOption

  // 参数的位置，
  paramType?: 'query' | 'header' | 'path' | 'body'

  // title?: string
  // format?: string
  default?: string

  enumTypes?: string
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

  constructor(option: TypeItemOption) {
    for (const [key, value] of Object.entries(option)) {
      if (value !== undefined) this[key as keyof TypeItem] = value
    }
  }
}
