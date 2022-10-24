import TypeItem, { TypeItemOption } from './typeItem'
import Components, { ComponentsBase } from './components'
import type { OpenAPIV3 } from 'openapi-types'
import type { ComponentsChildBase } from './type'

type Schema = OpenAPIV3.ReferenceObject & OpenAPIV3.SchemaObject
export type ParametersData = OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject

export default class Parameters extends ComponentsBase implements ComponentsChildBase {
  typeName!: string
  typeItems: TypeItem[] = []
  description?: string
  additionalProperties: any

  constructor(private parent: Components, public name: string, private datas: ParametersData[]) {
    super()
    const refs = datas.filter(i => i.$ref)

    this.typeName = name
  }

  init = () => {
    this.datas.forEach(i => {
      this.format(i)
    })
  }

  private format(data: ParametersData) {
    const { name, deprecated, schema, required, description, example } = data
    const { type = 'any', $ref } = (schema as Schema) ?? {}

    if ($ref) {
      return
    }

    const paramType = data.in as TypeItemOption['paramType']
    const enumTypes = (schema as Schema)?.enum?.join('|') ?? undefined

    const option = { $ref, name, type, paramType, required, example, enumTypes, description, deprecated }
    this.typeItems.push(new TypeItem(option))
  }
}
