import TypeItem from '../typeItem'
import Components from '../components'
import ComponentsBase from './base'
import type { ComponentsChildBase } from '../type'
import type {
  BodyObject,
  ResponseData,
  SchemaObject,
  ResponseObject,
  MediaTypeObject,
  ReferenceObject,
  RequestBodyObject,
  ExternalDocumentationObject,
} from '../../types/openapi'

export default class RequestBodies extends ComponentsBase implements ComponentsChildBase {
  title?: string
  required?: boolean
  contentType?: string

  typeName: string
  typeItems: TypeItem[] = []

  // 如果 refValue 存在，则该类型直接引用到对应类型上
  // interface ${typeName} ectends ${refValue.typeName} {}
  refValue?: ComponentsChildBase

  extendList: ComponentsChildBase[] = []
  deprecated?: boolean
  description?: string
  externalDocs?: ExternalDocumentationObject
  additionalProperties?: boolean | ReferenceObject | SchemaObject

  constructor(parent: Components, public name: string, private data: BodyObject | ResponseData) {
    super(parent)
    this.typeName = name
  }

  init() {
    const { $ref } = this.data as ReferenceObject
    if ($ref) {
      // 引用其它类型
      this.refValue = this.findRefType($ref)
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
      this.refValue = this.findRefType($ref)
    } else {
      const schemaList = Object.entries(schema as SchemaObject)
      for (const keyValue of schemaList) {
        this.typeItems.push(this.formatSchema(keyValue))
      }
    }
  }
}
