import { isObject } from '../common/utils'
import type { OpenAPIV3 } from 'openapi-types'
import Components, { ChildType, ComponentsChildBase } from './components'

export type SchemasData = OpenAPIV3.ReferenceObject & OpenAPIV3.SchemaObject

export default class Schemas implements ComponentsChildBase {
  types: ChildType[] = []
  title?: string
  typeName!: string
  required: string[] = []
  properties: Record<string, SchemasData>
  description?: string
  externalDocs?: OpenAPIV3.ExternalDocumentationObject
  additionalProperties?: boolean | OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject

  constructor(private parent: Components, private data: SchemasData) {
    const { required = [], properties, title, description, externalDocs, additionalProperties } = data ?? {}
    this.title = title
    this.required = required
    this.properties = properties ?? ({} as any)
    this.description = description
    this.externalDocs = externalDocs
    this.additionalProperties = additionalProperties
  }

  init = () => {
    this.types = this.start(this.properties, this.required)
  }

  private start(properties: Record<string, SchemasData>, requiredNames: string[] = []) {
    return Object.entries(properties).map(([name, v]) => {
      const item = this.format(v)
      return { ...item, name, required: requiredNames.includes(name) }
    })
  }

  private format(data: SchemasData): Omit<ChildType, 'name'> {
    const { properties, items } = data as SchemasData & { properties: Record<string, SchemasData>; items: SchemasData }
    const { $ref, type = 'any', description, externalDocs } = data
    const { example, deprecated, nullable, required } = data

    const enumTypes = data.enum?.join('|') ?? undefined
    const children = isObject(properties) ? this.start(properties, required) : undefined
    const genericsItems = isObject(items) ? this.format(items) : undefined

    return {
      $ref,
      type,
      example,
      children,
      nullable,
      enumTypes,
      deprecated,
      description,
      externalDocs,
      genericsItems
    }
  }
}
