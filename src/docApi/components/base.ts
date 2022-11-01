import {
  BaseSchemaObject,
  ComponentsObject,
  SchemaItemsObject,
  SchemaObjectType,
  SchemasData
} from '../../types/openapi'
import Components from '../components'
import { ComponentsChildBase } from '../type'
import TypeItem, { TypeItemOption } from '../typeItem'

export default class ComponentsBase {
  constructor(protected parent: Components) {}

  getType(type?: SchemaObjectType, ref?: string): TypeItemOption['type'] {
    if (ref) return this.findRefType(ref)
    if (!type) return 'any'
    if (type === 'integer') return 'number'
    if (type === 'array') return 'Array'
    return type
  }

  findRefType(ref: string): ComponentsChildBase | undefined {
    if (!/^(#\/components\/)/.test(ref)) return
    const [model, typeName] = ref.replace(RegExp.$1, '').split('/') as [keyof ComponentsObject, string]
    return this.parent[model][typeName]
  }

  protected formatSchema([keyName, keyValue]: [string, SchemasData], requiredNames: string[] = []): TypeItem {
    // console.log(keyName, keyValue)
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

    // const enumTypes = _enum.join('|') ?? undefined
    // console.log({ keyName, genericsItem, enumTypes })

    // console.log({ enumTypes })
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
}
