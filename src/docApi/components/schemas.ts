import TypeItem from '../typeItem'
import Components from '../components'
import ComponentsBase from './base'
import type { ComponentsChildBase } from '../type'
import type { SchemasData, SchemaObject, ReferenceObject, ExternalDocumentationObject } from '../../types/openapi'

export default class Schemas extends ComponentsBase implements ComponentsChildBase {
  $ref?: string
  required: string[] = []
  properties: Record<string, SchemaObject> = {}
  externalDocs?: ExternalDocumentationObject
  additionalProperties?: boolean | ReferenceObject | SchemaObject

  constructor(parent: Components, public name: string, private data: SchemasData, public resConentType?: string) {
    super(parent, name)
    const { $ref } = data as ReferenceObject
    if ($ref) {
      this.$ref = $ref
    } else {
      const {
        title,
        required = [],
        properties,
        deprecated,
        description,
        externalDocs,
        additionalProperties
      } = this.data as SchemaObject
      this.title = title
      this.required = required
      this.properties = properties ?? ({} as any)
      this.deprecated = deprecated
      this.description = description
      this.externalDocs = externalDocs
      this.additionalProperties = additionalProperties
    }
  }

  init = () => {
    if (this.$ref) {
      // 引用其它类型
      this.pushRef(this.$ref)
    } else {
      for (const keyItem of Object.entries(this.properties)) {
        this.typeItems.push(this.formatSchema(keyItem, this.required)) // = this.start(this.properties, this.required)
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
