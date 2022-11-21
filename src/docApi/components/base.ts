import {
  SchemasData,
  BaseSchemaObject,
  ComponentsObject,
  SchemaItemsObject,
  SchemaObjectType,
  ParameterObject
} from '../../types/openapi'
import Components from '../components'
import { Schema } from './parameters'
import { ComponentsChildBase } from '../type'
import TypeItem, { TypeItemOption } from '../typeItem'

export default class ComponentsBase {
  baseRef = '#/components/'
  title?: string
  typeName: string
  typeItems: TypeItem[] = []
  deprecated?: boolean
  description?: string
  refs: ComponentsChildBase[] = []
  attrs: Record<string, any> = {} // 自定义属性

  get isEmpty() {
    const { typeItems, refs } = this
    return refs.every(i => i.isEmpty) && typeItems.length === 0
  }

  constructor(protected parent: Components, public name: string) {
    this.typeName = parent.checkName(name)
  }

  getType(type?: SchemaObjectType, ref?: string): TypeItemOption['type'] {
    if (ref) return this.findRefType(ref)
    if (!type) return 'any'
    if (type === 'array') return 'Array'
    if (type === 'integer') return 'number'
    return type
  }

  findRefType(ref: string): ComponentsChildBase | undefined {
    if (!ref.startsWith(this.baseRef)) return
    const [moduleName, typeName] = ref.replace(this.baseRef, '').split('/') as [keyof ComponentsObject, string]
    const typeItem = this.parent.typeInfoList.find(i => i.moduleName === moduleName && i.typeInfo.name === typeName)
    return typeItem?.typeInfo
  }

  pushRef(ref?: string) {
    if (!ref) return
    const extend = this.findRefType(ref)
    if (extend) this.refs.push(extend)
  }

  protected formatSchema([keyName, keyValue]: [string, SchemasData], requiredNames: string[] = []): TypeItem {
    const {
      example,
      nullable,
      required,
      properties,
      deprecated,
      description,
      externalDocs,
      enum: _enum = []
    } = keyValue as BaseSchemaObject

    const { items, type, $ref } = keyValue as SchemaItemsObject

    // items 泛型入参，最多只有一个泛型入参
    // openapi3 没有了泛型形参定义
    const { $ref: itemRef } = items ?? {}
    let genericsItem: TypeItemOption['genericsItem']
    if (itemRef) {
      // 泛型 为 引用类型
      genericsItem = this.getType(undefined, itemRef)
    } else if (items) {
      // 泛型 为 schema 类型
      genericsItem = this.formatSchema([`${keyName}Items`, items])
    }

    const children = !!properties ? Object.entries(properties).map(i => this.formatSchema(i, required)) : undefined
    return new TypeItem({
      example,
      nullable,
      children,
      deprecated,
      description,
      externalDocs,
      genericsItem,
      name: keyName,
      enumTypes: _enum,
      type: this.getType(type, $ref),
      required: requiredNames.includes(keyName)
    })
  }

  protected formatParameters(data: ParameterObject) {
    const { name, deprecated, schema, required, description, example } = data
    const { type: defType, items, $ref } = schema as SchemaItemsObject

    let genericsItem: TypeItemOption['genericsItem']
    if ($ref) {
      genericsItem = this.getType(defType, $ref)
    } else if (items) {
      genericsItem = this.formatSchema([`${name}Items`, items])
    }

    const type = this.getType(defType, $ref)

    const paramType = data?.in as TypeItemOption['paramType']
    const enumTypes = (schema as Schema)?.enum

    return new TypeItem({
      name,
      type,
      paramType,
      required,
      example,
      enumTypes,
      description,
      deprecated,
      genericsItem
    })
  }
}
