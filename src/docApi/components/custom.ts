import TypeItem from '../typeItem'
import Components from '../components'
import ComponentsBase from './base'
import type { ComponentsChildBase } from '../type'
import type { ParameterObject, ExternalDocumentationObject } from '../../types/openapi'

export type CustomObject = Omit<ParameterObject, 'in'>

export default class Custom extends ComponentsBase implements ComponentsChildBase {
  additionalProperties: any
  externalDocs?: ExternalDocumentationObject

  constructor(parent: Components, public name: string, private datas: CustomObject[]) {
    super(parent, name)
  }

  init = () => {
    for (const keyItem of this.datas) {
      this.typeItems.push(new TypeItem(this.formatParameters(keyItem as ParameterObject)))
    }
  }
}
