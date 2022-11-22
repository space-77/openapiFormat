import Components from '../components'
import ComponentsBase from './base'
import type { SchemaObject, ParameterObject, ReferenceObject, ExternalDocumentationObject } from '../../types/openapi'

export type Schema = ReferenceObject & SchemaObject
export type ParametersData = ReferenceObject | ParameterObject

export default class Parameters extends ComponentsBase {
  additionalProperties: any
  externalDocs?: ExternalDocumentationObject

  constructor(parent: Components, public name: string, private datas: ParametersData[]) {
    super(parent, name)
  }

  init = () => {
    for (const keyItem of this.datas) {
      const { $ref } = keyItem as any
      if ($ref) {
        this.pushRef($ref)
      } else {
        this.typeItems.push(this.formatParameters(keyItem as ParameterObject))
      }
    }
  }
}
