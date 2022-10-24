import TypeItem from './typeItem'
import type { OpenAPIV3 } from 'openapi-types'

export interface GenericsItems {
  type?: string
  $ref?: string
}

export interface ComponentsChildBase {
  name: string
  title?: string
  typeName: string
  typeItems: TypeItem[]
  description?: string
  externalDocs?: OpenAPIV3.ExternalDocumentationObject

  // Record
  additionalProperties?: boolean | OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject

  init: () => void
}
