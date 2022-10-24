import { HttpMethods, httpMethods } from '../common'
import FunInfo from './funInfo'
import Components from './components'
import type { OpenAPIV3 } from 'openapi-types'
import { getIdentifierFromUrl, getMaxSamePath } from '../common/utils'
import isKeyword from 'is-es2016-keyword'

// 数据模板： https://github.com/openapi/openapi/tree/master/src/mocks

export interface PathItem {
  name: string
  item: OpenAPIV3.OperationObject
  method: HttpMethods
  apiPath: string
}
export default class DocApi {
  // 相同的路径
  samePath = ''
  pathItems: PathItem[] = []
  components!: Components
  apiFunInfos: FunInfo[] = []

  constructor(private json: OpenAPIV3.Document) {
    // 1、先收集数据
    // 2、再整理数据
    this.formatFuns()
    this.formatTypes()
  }

  private formatTypes() {
    // 1、梳理 收集 类型以及类型索引
    // 2、整理 类型数据
    // if (!this.json.components) return
    this.components = new Components(this.json, this.pathItems)
  }

  private formatFuns() {
    // 1、整理函数名（名字 翻译、去重、去关键字）
    // 2、整理函数名
    // 3、整理入参
    // 4、整理返回数据类型
    const funData = Object.entries(this.json.paths)

    this.samePath = getMaxSamePath(Object.keys(this.json.paths).map(path => path.slice(1)))

    for (const [apiPath, pathsObject] of funData) {
      if (!pathsObject) break

      for (const method of httpMethods) {
        const item = pathsObject[method] as OpenAPIV3.OperationObject | undefined
        if (!item) continue
        const name = this.createFunName(apiPath, method, item.operationId)
        this.pathItems.push({ item, name, apiPath, method })
        // const {  } = pathItem

        // const funInfo = new FunInfo(this, apiPath, method, pathItem, this.samePath)
        // this.apiFunInfos.push(funInfo)
      }
    }
  }

  private createFunName(apiPath: string, method: string, operationId?: string) {
    // let name = ''

    if (operationId) {
      //  整理 operationId 作为方法名
      return operationId.replace(/(.+)(Using.+)/, '$1')
      // name = operationId.replace(/_/, '')
    } else {
      // 整理 url 作为方法名
      return getIdentifierFromUrl(apiPath, method, this.samePath)
    }

    // // TODO 如果转非 js 语言的代码，可能兼用该语言的关键字
    // if (isKeyword(name)) name = `${name}Func`
    // return name
  }
}
