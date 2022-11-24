import TypeInfoBase from './base'
import Components, { ModuleName } from '../components'
import type { ParameterObject } from '../../types/openapi'

export type CustomObject = Omit<ParameterObject, 'in'>

export type CustomOp = { parent: Components; name: string; datas: CustomObject[]; moduleName: ModuleName }
export default class Custom extends TypeInfoBase {
  datas: CustomOp['datas']
  moduleName: ModuleName

  constructor(op: CustomOp) {
    const { parent, name, datas, moduleName } = op
    super(parent, name)
    this.datas = datas
    this.moduleName = moduleName
  }

  init = () => {
    for (const keyItem of this.datas) {
      this.typeItems.push(this.formatParameters(keyItem as ParameterObject))
    }
  }
}
