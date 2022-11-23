import Components from '../components'
import ComponentsBase from './base'
import type { SchemasData, SchemaObject, ReferenceObject } from '../../types/openapi'

export default class Schemas extends ComponentsBase {
  $ref?: string

  constructor(parent: Components, public name: string, private data: SchemasData, public resConentType?: string) {
    super(parent, name)
  }

  init = () => {
    const { data, name } = this
    const { $ref } = data as ReferenceObject
    // const { items, type } = data as Partial<ArraySchemaObject>
    // if (items && type) {
    //   // 继承泛型逻辑
    //   this.createGenericsTypeinfo(items, firstToUpper(name))
    // }

    if ($ref) {
      // 引用其它类型
      this.pushRef($ref)
    } else {
      this.typeItems.push(...this.createSchemaTypeItem(data as SchemaObject, name))
    }
  }
}
