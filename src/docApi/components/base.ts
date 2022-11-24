import {
  BaseSchemaObject,
  ComponentsObject,
  SchemaObjectType,
  ParameterObject,
  SchemaObject,
  ReferenceObject,
  ArraySchemaObject,
  ExternalDocumentationObject,
  NonArraySchemaObject,
  SchemasData
} from '../../types/openapi'
import Schemas, { SchemasOp } from './schemas'
import Components, { ModuleName } from '../components'
import { firstToUpper } from '../../common/utils'
import TypeItem from '../typeItem'

// FIXME 类型继承，可能会存在这种怪异类型
// interface TypeName extends Array<number> {
//   test: ''
// }
export type RefItem = { typeInfo: TypeInfoBase; genericsItem?: TypeInfoBase | string }

const baseRef = '#/components/'
export default abstract class TypeInfoBase {
  title?: string
  typeName: string
  typeItems: TypeItem[] = []
  deprecated?: boolean
  description?: string
  abstract moduleName: ModuleName
  // 继承类型的泛型入参 interface TypeName extends Array<number> {}
  refs: RefItem[] = []
  attrs: Record<string, any> = {} // 自定义属性
  /** 外部链接描叙 */
  externalDocs?: ExternalDocumentationObject
  resConentType?: string

  get isEmpty(): boolean {
    const { typeItems, refs } = this
    return refs.every(i => i.typeInfo.isEmpty && i.typeInfo?.typeName !== 'Array') && typeItems.length === 0
  }

  constructor(protected parent: Components, public name: string) {
    this.typeName = parent.checkName(name)
  }

  getExtends() {}

  abstract init(): void

  protected getType(type?: SchemaObjectType, ref?: string): TypeItem['type'] {
    if (ref) return this.findRefType(ref)
    if (!type) return 'any'
    if (type === 'array') return 'Array'
    if (type === 'integer') return 'number'
    return type
  }

  protected findRefType(ref: string): TypeInfoBase | undefined {
    if (!ref.startsWith(baseRef)) return
    const [moduleName, typeName] = ref.replace(baseRef, '').split('/') as [keyof ComponentsObject, string]
    const typeItem = this.parent.typeInfoList.find(i => i.moduleName === moduleName && i.typeInfo.name === typeName)
    return typeItem?.typeInfo
  }

  protected pushRef(ref?: string, genericsItem?: TypeInfoBase) {
    if (!ref) return
    const typeInfo = this.findRefType(ref)
    if (typeInfo) this.refs.push({ typeInfo, genericsItem })
  }

  protected createGenericsTypeinfo(items: ReferenceObject | SchemaObject, name: string): RefItem {
    // 继承泛型逻辑

    const { parent } = this
    const { type } = items as SchemaObject
    const { $ref } = items as ReferenceObject
    const { items: cItems } = items as ArraySchemaObject
    const option: SchemasOp = { parent, name: 'Array', data: items, moduleName: 'schemas' }
    const typeInfo = new Schemas(option) // 创建 ts 原生 Array【用于类型继承，不会生成类型】
    let genericsItem: TypeInfoBase | string | undefined = 'any'
    if ($ref) {
      genericsItem = this.findRefType($ref)
    } else if (typeof type === 'string') {
      genericsItem = type
    } else if (cItems) {
      // 创建泛型类型
      const option: SchemasOp = { parent, name: firstToUpper(`${name}T`), data: cItems, moduleName: 'schemas' }
      genericsItem = new Schemas(option)
      genericsItem.init()
      this.parent.pushTypeItem(genericsItem)
    }
    return { typeInfo, genericsItem }
  }

  protected createSchemaTypeItem(schema: SchemaObject, name: string): TypeItem[] {
    const { items } = schema as Partial<ArraySchemaObject>
    const { properties, additionalProperties, required = [], type } = schema

    // 泛型逻辑
    if (items) {
      const ref = this.createGenericsTypeinfo(items, name)
      this.refs.push(ref)
    }

    if (!properties) return []
    const typeItemList = Object.entries(properties).map(([name, schema]) =>
      this.createSchemaType(name, schema, required.includes(name))
    )

    // TODO 处理 Record 类型
    if (additionalProperties) {
      if (typeof additionalProperties === 'boolean') {
      } else {
        // let typeItem =
        if ((additionalProperties as ReferenceObject).$ref) {
        }
        console.log(additionalProperties)
      }
      // const { propertyName, mapping } = discriminator
      // typeItemList.push(
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
    return typeItemList
  }

  protected createSchemaType(keyName: string, schema: SchemasData, required?: boolean): TypeItem {
    const { $ref } = schema as ReferenceObject
    const { items } = schema as ArraySchemaObject // 数组需要泛型入参
    const { type } = schema as NonArraySchemaObject

    const {
      format,
      example,
      nullable,
      properties = {},
      deprecated,
      description,
      externalDocs,
      enum: _enum = [],
      required: childrenRequired = []
    } = schema as BaseSchemaObject

    const children = Object.entries(properties).map(([name, schema]) =>
      this.createSchemaType(name, schema, childrenRequired.includes(name))
    )
    return new TypeItem({
      ref: items ? this.createGenericsTypeinfo(items, keyName) : undefined,
      format,
      example,
      nullable,
      children,
      required,
      deprecated,
      description,
      externalDocs,
      name: keyName,
      enumTypes: _enum,
      type: this.getType(type, $ref)
    })
  }

  protected formatParameters(data: ParameterObject) {
    const { name, in: paramType, deprecated, schema = {}, required, description, example } = data
    const typeItem = this.createSchemaType(name, { ...schema, deprecated, description, example }, required)
    typeItem.paramType = paramType as TypeItem['paramType']
    return typeItem
  }
}
