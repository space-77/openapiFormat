import {
  BaseSchemaObject,
  ComponentsObject,
  SchemaItemsObject,
  SchemaObjectType,
  ParameterObject,
  SchemaObject,
  Properties,
  ReferenceObject,
  ArraySchemaObject,
  ExternalDocumentationObject
} from '../../types/openapi'
// import { ComponentsChildBase } from '../type'
import Custom from './custom'
import Schemas from './schemas'
import { Schema } from './parameters'
import Components from '../components'
import { firstToUpper } from 'src/common/utils'
import TypeItem, { TypeItemOption } from '../typeItem'

// FIXME 类型继承，可能会存在这种怪异类型
// interface TypeName extends Array<number> {
//   test: ''
// }

export default abstract class ComponentsBase {
  baseRef = '#/components/'
  title?: string
  typeName: string
  typeItems: TypeItem[] = []
  deprecated?: boolean
  description?: string
  // 继承类型的泛型入参 interface TypeName extends Array<number> {}
  refs: { typeInfo: ComponentsBase; genericsItem?: ComponentsBase }[] = []
  attrs: Record<string, any> = {} // 自定义属性
  /** 外部链接描叙 */
  externalDocs?: ExternalDocumentationObject
  resConentType?: string

  get isEmpty(): boolean {
    const { typeItems, refs } = this
    return refs.every(i => i.typeInfo.isEmpty && i.genericsItem?.typeName !== 'Array') && typeItems.length === 0
  }

  constructor(protected parent: Components, public name: string) {
    this.typeName = parent.checkName(name)
  }

  abstract init(): void

  getType(type?: SchemaObjectType, ref?: string): TypeItemOption['type'] {
    if (ref) return this.findRefType(ref)
    if (!type) return 'any'
    if (type === 'array') return 'Array'
    if (type === 'integer') return 'number'
    return type
  }

  findRefType(ref: string): ComponentsBase | undefined {
    if (!ref.startsWith(this.baseRef)) return
    const [moduleName, typeName] = ref.replace(this.baseRef, '').split('/') as [keyof ComponentsObject, string]
    const typeItem = this.parent.typeInfoList.find(i => i.moduleName === moduleName && i.typeInfo.name === typeName)
    return typeItem?.typeInfo
  }

  pushRef(ref?: string, genericsItem?: ComponentsBase) {
    if (!ref) return
    const typeInfo = this.findRefType(ref)
    if (typeInfo) this.refs.push({ typeInfo, genericsItem })
  }

  createGenericsTypeinfo(items: ReferenceObject | SchemaObject, name: string) {
    // 继承泛型逻辑

    const { $ref } = items as ReferenceObject

    if ($ref) {
      this.pushRef($ref)
    } else {
      // 创建泛型类型
      const typeInfo = new Custom(this.parent, 'Array', []) // 创建 ts 原生 Array【用于类型继承，不会生成类型】
      const tTypeItem = new Schemas(this.parent, firstToUpper(`${name}T`), items as SchemaObject)
      tTypeItem.init()
      this.parent.pushTypeItem('schemas', tTypeItem)
      this.refs.push({ typeInfo, genericsItem: tTypeItem })
    }
  }

  protected createSchemaTypeItem(schemaInfo: SchemaObject, name: string): TypeItem[] {
    const { items } = schemaInfo as ArraySchemaObject
    const { properties, additionalProperties, required, type } = schemaInfo

    // 泛型逻辑
    if (items) {
      this.createGenericsTypeinfo(items, name)
    }

    if (!properties) return []
    const typeKeyInfo = Object.entries(properties).map(i => this.formatSchema(i, required))
    if (additionalProperties) {
      if (typeof additionalProperties === 'boolean') {
      } else {
        // let typeItem =
        if ((additionalProperties as ReferenceObject).$ref) {
        }
        console.log(additionalProperties)
      }
      // const { propertyName, mapping } = discriminator
      // typeKeyInfo.push(
      //   new TypeItem({
      //     name: propertyName,
      //     type: !mapping ? 'Record<string, any>' : undefined,
      //     children: mapping
      //       ? Object.entries(mapping).map(
      //           ([name, value]) => new TypeItem({ name, type: this.getType(value as SchemaObjectType) })
      //         )
      //       : undefined
      //   })
      // )
    }
    return typeKeyInfo
  }

  protected formatSchema([keyName, keyValue]: [string, Properties], requiredNames: string[] = []): TypeItem {
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
    let genericsItem: TypeItemOption['genericsItem'] | undefined
    if (itemRef) {
      // 泛型 为 引用类型
      genericsItem = this.getType(undefined, itemRef)
    } else if (items) {
      // 泛型 为 schema 类型
      genericsItem = this.formatSchema([`${keyName}Items`, items], required)
    }

    const children = !!properties ? this.createSchemaTypeItem(properties, keyName) : undefined
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
