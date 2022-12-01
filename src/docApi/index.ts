import Translate, { DictList } from '../common/translate'
import Components from './components'
import ComponentsBase from './components/base'
import type { OpenAPIV3 } from 'openapi-types'
import { OperationObject } from '../types/openapi'
import { HttpMethods, httpMethods } from '../common'
import { checkName, firstToUpper, getIdentifierFromUrl, getMaxSamePath, getSamePath } from '../common/utils'

// 数据模板： https://github.com/openapi/openapi/tree/master/src/mocks

export interface PathItem {
  name: string
  item: OpenAPIV3.OperationObject
  method: HttpMethods
  apiPath: string
  bodyName: string
  moduleName: string
  paramsName: string
  responseName: string
  responseType?: ComponentsBase
  parameterType?: ComponentsBase
  requestBodyType?: ComponentsBase
}

export type FuncGroupList = {
  moduleName: string
  description?: string
  funcInfoList: PathItem[]
}

export type FuncGroupItem = { item: OperationObject; apiPath: string; method: HttpMethods; tags: string[] }
export type FuncGroup = {
  funs: FuncGroupItem[]
  moduleName: string
  tagInfo?: OpenAPIV3.TagObject
}

export type PathInfo = { moduleName: string; tagInfo?: OpenAPIV3.TagObject; pathItems: PathItem[] }

export default class DocApi {
  funcGroupList: PathInfo[] = []

  private pathItems: PathItem[] = []
  typeGroup!: Components
  constructor(public json: OpenAPIV3.Document) {}

  async init() {
    // 1、翻译
    // 2、先收集数据
    // 3、再整理数据
    const moduleList = this.funcGroup()
    this.formatFunsV2(moduleList)
    this.formatTypes()
  }

  private formatTypes() {
    // 1、梳理 收集 类型以及类型索引
    // 2、整理 类型数据
    this.typeGroup = new Components(this.json, this.pathItems)
  }

  private funcGroup() {
    const { json } = this
    const { tags: tagList = [], paths } = json

    const moduleList: FuncGroup[] = []
    const funData = Object.entries(paths)

    for (const [apiPath, pathsObject] of funData) {
      if (!pathsObject) break

      for (const method of httpMethods) {
        const item = pathsObject[method] as OperationObject | undefined
        if (!item) continue

        const { tags = ['moduleDef'] } = item
        const funItem: FuncGroupItem = { item, apiPath, method, tags }
        tags.forEach(tag => {
          const moduleItem = moduleList.find(i => i.moduleName === tag)
          if (!moduleItem) {
            const tagInfo = tagList.find(i => i.name === tag)
            moduleList.push({ moduleName: tag, funs: [funItem], tagInfo })
          } else {
            moduleItem.funs.push(funItem)
          }
        })
      }
    }

    const rootSamePath = getMaxSamePath(Object.keys(json.paths).map(path => path.slice(1)))

    // 优化模块名字
    moduleList.forEach(mod => {
      const { funs } = mod
      const samePath = getSamePath(funs.map(i => i.apiPath.replace(rootSamePath, '')))
      let moduleName = Translate.startCaseClassName(samePath, 3) || mod.moduleName

      // 保证模块名字唯一性
      const names = moduleList.map(i => i.moduleName)
      moduleName = checkName(moduleName, n => names.includes(n))
      mod.moduleName = moduleName
    })

    return moduleList
  }

  private creatFunItem(funInfo: FuncGroupItem, name: string, moduleName: string) {
    const { apiPath, method, item } = funInfo
    const funcName = firstToUpper(name)
    const bodyName = `${funcName}Body`
    const paramsName = `${funcName}Params`
    const responseName = `${funcName}Res`
    return {
      item,
      name,
      method,
      apiPath,
      bodyName,
      moduleName,
      paramsName,
      responseName
    }
  }

  private formatFunsV2(moduleList: FuncGroup[]) {
    const pathInfoList: PathInfo[] = []
    const funKeys = new Set<FuncGroupItem>([])

    moduleList.forEach(moduleItem => {
      const { funs, moduleName, tagInfo } = moduleItem
      const names = new Set<string>([])
      const samePath = getMaxSamePath(funs.map(i => i.apiPath.slice(1)))

      const pathItems = funs.map(funInfo => {
        const { item, method, apiPath } = funInfo
        let name = this.createFunName(apiPath, samePath, method, item.operationId)
        name = checkName(name, checkName => names.has(checkName))
        names.add(name)

        const funItem = this.creatFunItem(funInfo, name, moduleName)

        this.pathItems.push(funItem)

        return funItem
      })

      const pathInfo = { moduleName, tagInfo, pathItems }

      pathInfoList.push(pathInfo)

      return
    })

    this.funcGroupList = pathInfoList
  }

  private createFunName(apiPath: string, samePath: string, method: string, operationId?: string) {
    if (operationId) {
      //  整理 operationId 作为方法名
      return operationId.replace(/(.+)(Using.+)/, '$1')
      // name = operationId.replace(/_/, '')
    } else {
      // 整理 url 作为方法名
      return getIdentifierFromUrl(apiPath, method, samePath)
    }

    // // TODO 如果转非 js 语言的代码，可能兼用该语言的关键字
    // if (isKeyword(name)) name = `${name}Func`
    // return name
  }
}
