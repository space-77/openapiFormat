import Components from '../components'
import ComponentsBase from './base'
import { firstToUpper } from 'src/common/utils'
import type { SchemasData, SchemaObject, ReferenceObject, ArraySchemaObject } from '../../types/openapi'

export default class Schemas extends ComponentsBase {
  $ref?: string

  constructor(parent: Components, public name: string, private data: SchemasData, public resConentType?: string) {
    super(parent, name)
    const { $ref } = data as ReferenceObject
    const { items, type } = data as Partial<ArraySchemaObject>
    if ($ref) {
      this.$ref = $ref
    } else if (items && type) {
      // 继承泛型逻辑
      this.createGenericsTypeinfo(items, firstToUpper(name))
      // const typeItem = new Custom(parent, 'Array', []) // 创建 ts 原生 Array【用于类型继承，不会生成类型】

      // const { $ref } = items as ReferenceObject

      // if ($ref) {
      //   typeItem.genericsItem = this.findRefType($ref)
      // } else {
      //   // 创建泛型类型
      //   const tTypeItem = new Schemas(parent, firstToUpper(`${name}T`), items as SchemaObject)
      //   tTypeItem.init()
      //   this.parent.pushTypeItem('schemas', tTypeItem)
      //   typeItem.genericsItem = tTypeItem
      // }
      // this.refs.push(typeItem)
    }
  }

  init = () => {
    const { $ref, data } = this
    if ($ref) {
      // 引用其它类型
      this.pushRef($ref)
    } else {
      this.typeItems.push(...this.createSchemaTypeItem(data as SchemaObject, this.name))
    }
  }
}
