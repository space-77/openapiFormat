import TypeItem from '../typeItem'
import Components from '../components'
import ComponentsBase from './base'
import type { ComponentsChildBase } from '../type'
import type { SchemasData, SchemaObject, ReferenceObject, ExternalDocumentationObject } from '../../types/openapi'

export default class Schemas extends ComponentsBase implements ComponentsChildBase {
  $ref?: string
  title?: string
  typeName: string
  required: string[] = []
  typeItems: TypeItem[] = []
  description?: string

  // 如果 refValue 存在，则该类型直接引用到对应类型上
  // interface ${typeName} ectends ${refValue.typeName} {}
  refValue?: ComponentsChildBase

  properties: Record<string, SchemaObject> = {}
  extendList: ComponentsChildBase[] = []
  externalDocs?: ExternalDocumentationObject
  additionalProperties?: boolean | ReferenceObject | SchemaObject

  constructor(parent: Components, public name: string, private data: SchemasData) {
    super(parent)
    this.typeName = name
    const {$ref} = data as ReferenceObject
    if ($ref) {
      this.$ref = $ref
    } else {
      const {
        title,
        required = [],
        properties,
        description,
        externalDocs,
        additionalProperties
      } = this.data as SchemaObject
      this.title = title
      this.required = required
      this.properties = properties ?? ({} as any)
      this.description = description
      this.externalDocs = externalDocs
      this.additionalProperties = additionalProperties
    }
  }

  init = () => {
    if (this.$ref) {
      // 引用其它类型
      this.refValue = this.findRefType(this.$ref)
    } else {
      for (const keyItem of Object.entries(this.properties)) {
        this.typeItems.push(new TypeItem(this.formatSchema(keyItem, this.required))) // = this.start(this.properties, this.required)
      }
    }
  }

  // private format([keyName, keyValue]: [string, SchemasData], requiredNames: string[] = []): TypeItemOption {
  //   const {
  //     example,
  //     nullable,
  //     required,
  //     properties,
  //     deprecated,
  //     description,
  //     externalDocs,
  //     enum: _enum = []
  //   } = keyValue as BaseSchemaObject

  //   const { items, type, $ref } = keyValue as SchemaItemsObject

  //   // items 泛型入参，最多只有一个泛型入参
  //   // openapi3 没有了泛型形参定义
  //   const { $ref: itemRef } = items ?? {}
  //   const genericsItem = itemRef
  //     ? this.getType(undefined, itemRef)
  //     : this.format([`${keyName}Items`, items as SchemasData])

  //   const enumTypes = _enum.join('|') ?? undefined
  //   const children = !!properties ? Object.entries(properties).map(i => this.format(i, required)) : undefined
  //   return {
  //     example,
  //     nullable,
  //     children,
  //     enumTypes,
  //     deprecated,
  //     description,
  //     externalDocs,
  //     name: keyName,
  //     genericsItem,
  //     type: this.getType(type, $ref),
  //     required: requiredNames.includes(keyName)
  //   }
  // }
}
