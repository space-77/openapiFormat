import Components from '../components'
import ComponentsBase from './base'
import type {
  BodyObject,
  ResponseData,
  SchemaObject,
  ResponseObject,
  MediaTypeObject,
  ReferenceObject,
  RequestBodyObject,
  ExternalDocumentationObject,
  ArraySchemaObject
} from '../../types/openapi'
import { firstToUpper } from 'src/common/utils'

export default class RequestBodies extends ComponentsBase {
  required?: boolean
  contentType?: string
  additionalProperties?: boolean | ReferenceObject | SchemaObject

  constructor(parent: Components, public name: string, private data: BodyObject | ResponseData) {
    super(parent, name)
  }

  init() {
    const { $ref } = this.data as ReferenceObject
    if ($ref) {
      // 引用其它类型
      this.pushRef($ref)
    } else {
      const { required } = this.data as RequestBodyObject
      const { content = {}, description } = this.data as RequestBodyObject | ResponseObject
      this.required = required
      this.description = description

      // FIXME 目前只取字数最多的那个，
      // FIXME 当一个请求体类型匹配多个键时，只有最明确的键才适用。比如：text/plain 会覆盖 text/*
      const [[media, mediaTypeObject]] = Object.entries(content).sort(([a], [b]) => b.length - a.length)
      this.contentType = media
      this.format(mediaTypeObject)
    }
  }

  format(mediaTypeObject: MediaTypeObject) {
    const { schema, example, encoding } = mediaTypeObject
    const { $ref } = schema as ReferenceObject
    if ($ref) {
      // 引用其它类型
      this.pushRef($ref)
    } else {
      
      // 处理 泛型的可能
      const {items, type} = schema as Partial<ArraySchemaObject>
      if (items && type) {
        this.createGenericsTypeinfo(items, firstToUpper(this.name))
      }

      const { properties } = schema as SchemaObject
      if (!properties) return
      const schemaList = Object.entries(properties)
      for (const keyValue of schemaList) {
        const typeItem = this.formatSchema(keyValue)
        typeItem.paramType = 'body'
        this.typeItems.push(typeItem)
      }
    }
  }
}
