import { OpenAPIV3 } from 'openapi-types'
import TypeInfoBase from './components/base'

export interface TypeItemOption {
  name: string
  /**
   * @description 
   */
  type?: string | TypeInfoBase
  default?: string
  example?: string
  children?: TypeItem[]
  nullable?: boolean
  required?: boolean
  enumTypes?: any[]
  paramType?: 'query' | 'header' | 'path' | 'body' | 'cookie' // 参数的位置
  deprecated?: boolean
  description?: string
  minLength?: number
  maxLength?: number
  format?: string
  externalDocs?: OpenAPIV3.ExternalDocumentationObject /** 外部链接描叙 */
  ref?: { typeInfo: TypeInfoBase; genericsItem?: TypeInfoBase | string }
}
export default class TypeItem {
  name!: string
  type?: TypeItemOption['type']
  example?: string
  default?: string
  required?: boolean
  nullable?: boolean /** 可以为空 */
  children?: TypeItem[]
  enumTypes?: any[]
  paramType?: TypeItemOption['paramType']
  deprecated?: boolean /** 是否弃用 */
  description?: string
  minLength?: number
  maxLength?: number
  format?: string
  disable: boolean
  /** 泛型入参 */
  ref?: TypeItemOption['ref']
  // genericsItem?: string | TypeInfoBase | TypeItem /** 泛型入参 */ // 可能是 字符串， 可能是 引用类型， 可能是 引用类型也是需要入参的
  externalDocs?: TypeItemOption['externalDocs']

  constructor(option: TypeItemOption) {
    const { name, type, example, default: def, required } = option
    const {
      ref,
      format,
      nullable,
      children,
      enumTypes,
      paramType,
      deprecated,
      description,
      externalDocs,
      maxLength,
      minLength
    } = option
    this.ref = ref
    this.name = name
    this.type = type
    this.format = format
    this.default = def
    this.example = example
    this.required = required
    this.nullable = nullable
    this.children = children
    this.enumTypes = enumTypes
    this.paramType = paramType
    this.deprecated = deprecated
    this.description = description
    this.externalDocs = externalDocs
    this.minLength = minLength
    this.maxLength = maxLength
    this.disable = false
  }

  /**
   * @description 获取键值的类型
   */
  getKeyValue() {
    const { type, enumTypes = [], nullable, children = [], ref, format } = this
    const { typeInfo, genericsItem } = ref ?? {} // 泛型

    let content = ''
    if (enumTypes.length > 0) {
      content = enumTypes.map(i => `"${i}"`).join(' | ')
    } else if (typeof type === 'string') {
      if (format === 'binary') {
        // 使用文件 类型
        content = 'File'
      } else {
        content = type
      }
    } else if (type instanceof TypeInfoBase) {
      content = type.getRealBody().typeName
    } else if (!nullable) {
      content = 'any'
    }

    if (typeInfo) {
      // 生成泛型
      content = typeInfo.typeName
      let typeNameT = typeof genericsItem === 'string' ? genericsItem : genericsItem?.typeName
      if (typeNameT === 'Array') typeNameT = 'Array<any>'
      content += `<${typeNameT ?? 'any'}>`
    } else if (content === 'Array') content = 'Array<any>'

    // FIXME 如果泛型存在，而且也有子类型，该怎么处理？
    if (children.length > 0) {
      // 存在子类型，覆盖上面类型
      content = `{${children.map(i => i.getTypeValue()).join('')}}`
    }
    return `${content}${nullable ? `${content ? '|' : ''}null` : ''}`
  }

  getTypeValue(): string {
    const { name, required } = this

    let key = name.replace(/-/g, '_')
    if (/\./.test(key)) key = `'${key}'`

    const desc = this.getDesc()
    const typeValue = this.getKeyValue()

    return `${desc}${key}${required ? '' : '?'}:${typeValue}\n`
  }

  getDesc() {
    const { description, deprecated, example, default: def, externalDocs } = this
    if (!description && !example && !deprecated && !def && !externalDocs) return ''
    const { url, description: linkDescription } = externalDocs ?? {}
    const defaultStr = def ? `\r\n* @default ${def}` : ''
    const exampleStr = example ? `\r\n* @example ${example}` : ''
    const deprecatedStr = deprecated ? '\r\n* @deprecated' : ''
    const descriptionStr = description ? `\r\n* @description ${description}` : ''
    const link = url ? `\r\n* @link ${url} ${linkDescription}` : ''
    return `/**${exampleStr}${defaultStr}${descriptionStr}${deprecatedStr}${link}\r\n*/\r\n`
  }
}
