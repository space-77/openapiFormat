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
import _ from 'lodash'
import TypeItem from '../typeItem'
import Schemas, { SchemasOp } from './schemas'
import Components, { ModuleName } from '../components'
import { firstToUpper } from '../../common/utils'

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
  // moduleName: ModuleName
  // 继承类型的泛型入参 interface TypeName extends Array<number> {}
  refs: RefItem[] = []
  attrs: Record<string, any> = {} // 自定义属性
  realBody?: TypeInfoBase // 真实的引用
  // childrenRefs: TypeInfoBase[] = [] // 该类型被其它类型引用
  /** 外部链接描叙 */
  externalDocs?: ExternalDocumentationObject
  resConentType?: string

  get isEmpty(): boolean {
    const { typeItems, refs } = this
    return (
      refs.every(i => i.typeInfo.isEmpty && i.typeInfo?.typeName !== 'Array') &&
      typeItems.filter(i => !i.disable).length === 0
    )
  }

  constructor(protected parent: Components, public name: string, public moduleName: ModuleName) {
    this.typeName = parent.checkName(firstToUpper(name))
  }

  /**
   * @desc 获取真实类型，跳过空类型引用
   * 例如： C extends B, B extends A, 如果 B 和 C 都是空类型，那么调用 C 和 B 类型其实就是调用 A 类型
   */
  getRealBody(): TypeInfoBase {
    const typeItems = this.typeItems.filter(i => !i.disable)
    // 只有一个应用类型，并且没有子类型，并且有添加过真实类型的才可以往上去父类作为自己的类型
    if (this.refs.length === 1 && typeItems.length === 0 && this.realBody) {
      return this.realBody.getRealBody()
    }
    return this
  }

  getAllRefs(): RefItem[] {
    if (this.refs.length === 0) {
      return []
    } else {
      const refsList: RefItem[] = []
      this.refs.forEach(ref => {
        if (ref.typeInfo.refs.length > 0) {
          refsList.push(...ref.typeInfo.getAllRefs())
        } else {
        }
        refsList.push(ref)
      })
      return refsList
    }
  }

  getTypeItems = (): TypeItem[] => {
    const allTypesList: TypeItem[] = [...this.typeItems]
    const allRef = _.uniq(_.flattenDeep(this.getAllRefs()))
    allRef.forEach(i => {
      const { typeItems } = i.typeInfo
      if (typeItems.length > 0) allTypesList.push(...typeItems)
    })

    return _.uniq(allTypesList).map(i => {
      if (this.moduleName === 'requestBodies') {
        const ii = _.cloneDeep(i)
        ii.paramType = 'body'
        return ii
      } else {
        return i
      }
    })
  }

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

    if (typeInfo) {
      this.realBody = typeInfo
      // typeInfo.childrenRefs.push(this)
      this.refs.push({ typeInfo, genericsItem })
    }
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
      genericsItem = this.getType(type)
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
        // console.log(additionalProperties)
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
