import { OpenAPIV3 } from 'openapi-types'
import { GenericsItems } from './type'

export interface TypeItemOption {
  name: string
  type: string

  /** 引用其它类型 */
  $ref?: string
  /** 泛型入参 */
  genericsItems?: GenericsItems

  // 参数的位置，
  paramType?: 'query' | 'header' | 'path' | 'body'

  // title?: string
  // format?: string
  default?: string

  enumTypes?: string
  required?: boolean
  example?: string
  children?: TypeItem[]

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
  type!: string

  constructor(option: TypeItemOption) {
    for (const [key, value] of Object.entries(option)) {
      if (value !== undefined) this[key as keyof TypeItem] = value
    }
  }
}
