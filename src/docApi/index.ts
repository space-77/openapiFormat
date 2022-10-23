import { httpMethods } from '../common'
import FunInfo from './funInfo'
import Components from './components'
import type { OpenAPIV3 } from 'openapi-types'
import { getMaxSamePath } from '../common/utils'

// 数据模板： https://github.com/openapi/openapi/tree/master/src/mocks
export default class DocApi {
  // 相同的路径
  samePath = ''
  components!: Components
  apiFunInfos: FunInfo[] = []

  constructor(private json: OpenAPIV3.Document) {
    this.formatTypes()
    this.formatFuns()
  }

  private formatTypes() {
    if (!this.json.components) return
    this.components = new Components(this.json.components)
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
        const pathItem = pathsObject[method] as OpenAPIV3.OperationObject | undefined
        if (!pathItem) continue

        const funInfo = new FunInfo(apiPath, method, pathItem, this.samePath)
        this.apiFunInfos.push(funInfo)
      }
    }
  }
}
