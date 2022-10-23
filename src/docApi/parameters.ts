import type { OpenAPIV3 } from 'openapi-types'
import Components, { ChildType, ComponentsChildBase } from './components'

export type ParametersData = OpenAPIV3.ReferenceObject & OpenAPIV3.ParameterObject

export default class Parameters implements ComponentsChildBase {
  constructor(private parent: Components, private data: ParametersData) {}
  types: ChildType[] = []
  typeName!: string
  description?: string
  additionalProperties: any

  init = () => {
    throw new Error('Method not implemented.')
  }
}
