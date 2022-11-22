import Components from '../components'
import ComponentsBase from './base'
import type { ParameterObject, ExternalDocumentationObject } from '../../types/openapi'

export type CustomObject = Omit<ParameterObject, 'in'>

export default class Custom extends ComponentsBase {
  constructor(parent: Components, public name: string, private datas: CustomObject[]) {
    super(parent, name)
  }

  init = () => {
    for (const keyItem of this.datas) {
      this.typeItems.push(this.formatParameters(keyItem as ParameterObject))
    }
  }
}
