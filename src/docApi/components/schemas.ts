import Components, { ModuleName } from '../components'
import TypeInfoBase from './base'
import type { SchemasData, SchemaObject, ReferenceObject } from '../../types/openapi'

export type SchemasOp = { parent: Components; name: string; data: SchemasData; resConentType?: string; moduleName: ModuleName }
export default class Schemas extends TypeInfoBase {
  data: SchemasOp['data']
  resConentType?: string

  constructor(op: SchemasOp) {
    const { parent, name, data, resConentType, moduleName } = op
    super(parent, name, moduleName)
    this.data = data
    this.resConentType = resConentType
  }

  init = () => {
    const { data, name } = this
    const { $ref } = data as ReferenceObject

    if ($ref) {
      // 引用其它类型
      this.pushRef($ref)
    } else {
      this.typeItems.push(...this.createSchemaTypeItem(data as SchemaObject, name))
    }
  }
}
