import Components from '../components'
import ComponentsBase from './base'
import TypeItem, { TypeItemOption } from '../typeItem'
import type { ComponentsChildBase } from '../type'
import type {
  SchemaObject,
  ParameterObject,
  ReferenceObject,
  SchemaItemsObject,
  ExternalDocumentationObject
} from '../../types/openapi'

type Schema = ReferenceObject & SchemaObject
export type ParametersData = ReferenceObject | ParameterObject

export default class Parameters extends ComponentsBase implements ComponentsChildBase {
  title?: string
  typeName: string
  typeItems: TypeItem[] = []
  description?: string
  additionalProperties: any
  extendList: ComponentsChildBase[] = []
  externalDocs?: ExternalDocumentationObject

  constructor(parent: Components, public name: string, private datas: ParametersData[]) {
    super(parent)
    this.typeName = name
  }

  init = () => {
    for (const keyItem of this.datas) {
      const { $ref } = keyItem as any
      if ($ref) {
        const extend = this.findRefType($ref)
        if (extend) this.extendList.push(extend)
      } else {
        this.typeItems.push(new TypeItem(this.format(keyItem as ParameterObject)))
      }
    }
  }

  private format(data: ParameterObject): TypeItemOption {
    const { name, deprecated, schema, required, description, example } = data
    const { type: defType, items, $ref } = schema as SchemaItemsObject

    let genericsItem: TypeItemOption['genericsItem']
    if ($ref) {
      genericsItem = this.getType(defType, $ref)
    } else if (items) {
      genericsItem = this.formatSchema([`${name}Items`, items])
    }

    const type = this.getType(defType, $ref)

    const paramType = data.in as TypeItemOption['paramType']
    const enumTypes = (schema as Schema)?.enum

    return { name, type, paramType, required, example, enumTypes, description, deprecated, genericsItem }
  }
}
