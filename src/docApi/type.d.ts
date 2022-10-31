import TypeItem from './typeItem'
import type { ExternalDocumentationObject, ReferenceObject, SchemaObject } from '../types/openapi'

export type StaticImplements<I extends new (...args: any[]) => any, C extends I> = InstanceType<I>
export interface GenericsItems {
  type?: string
  $ref?: string
}

export interface ComponentsChildBase {
  name: string
  title?: string

  // // ref 引用值
  refValue?: ComponentsChildBase

  // TODO 翻译处理名字，添加回调函处理名字
  typeName: string
  typeItems: TypeItem[]
  extendList: ComponentsChildBase[]
  deprecated?: boolean
  description?: string
  externalDocs?: ExternalDocumentationObject

  // TODO Record
  additionalProperties?: boolean | ReferenceObject | SchemaObject

  init: () => void

  // getGenericsType(generics: TypeItemOption['genericsItem']): string
}
