import Translate, { DictList } from '../common/translate'
import Components from './components'
import ComponentsBase from './components/base'
import type { OpenAPIV3 } from 'openapi-types'
import { OperationObject } from '../types/openapi'
import { HttpMethods, httpMethods } from '../common'
import { checkName, firstToUpper, getIdentifierFromUrl, getMaxSamePath } from '../common/utils'

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
  // 相同的路径
  // private samePath = ''
  funcGroupList: PathInfo[] = []

  // public translate: Translate
  private pathItems: PathItem[] = []
  typeGroup!: Components
  // newFuncGroupList: FuncGroupList[] = []
  // get funcGroupList() {
  //   const funcGroupList: FuncGroupList[] = []
  //   const { pathItems, json } = this
  //   const { tags = [] } = json

  //   for (const pathItem of pathItems) {
  //     const { moduleName } = pathItem
  //     const funcInfo = funcGroupList.find(i => i.moduleName === moduleName)
  //     if (!funcInfo) {
  //       const { description } = tags.find(i => i.name === moduleName) ?? {}
  //       funcGroupList.push({ moduleName, description, funcInfoList: [pathItem] })
  //     } else {
  //       funcInfo.funcInfoList.push(pathItem)
  //     }
  //   }
  //   return funcGroupList
  // }

  constructor(public json: OpenAPIV3.Document) {
    // this.translate = new Translate(dictList)
  }

  async init() {
    // 1、翻译
    // 2、先收集数据
    // 3、再整理数据
    // this.onTranslate()
    const moduleList = this.funcGroup()
    // this.formatFuns()
    this.formatFunsV2(moduleList)
    this.formatTypes()
  }

  // private onTranslate() {
  //   const texts: string[] = []

  //   Object.values(this.json.paths).forEach(i => {
  //     // console.log(i);
  //     if (!i) return
  //     Object.values(i).forEach(j => {
  //       if (typeof j === 'object' && !Array.isArray(j)) {
  //         // console.log(j.operationId)
  //         // j.operationId
  //       }
  //     })
  //   })

  //   // console.log(paths)
  // }

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

    return moduleList
  }

  private creatFunItem(funInfo: FuncGroupItem, name: string, moduleName: string) {
    const { apiPath, method, item } = funInfo
    // const name = this.createFunName(apiPath, method, item.operationId)
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

  // private formatFuns() {
  //   // 1、整理函数名（名字 翻译、去重、去关键字）
  //   // 2、整理函数名
  //   // 3、整理入参
  //   // 4、整理返回数据类型
  //   const funData = Object.entries(this.json.paths)

  //   this.samePath = getMaxSamePath(Object.keys(this.json.paths).map(path => path.slice(1)))

  //   for (const [apiPath, pathsObject] of funData) {
  //     if (!pathsObject) break

  //     for (const method of httpMethods) {
  //       const item = pathsObject[method] as OperationObject | undefined
  //       if (!item) continue
  //       const name = this.createFunName(apiPath, method, item.operationId)
  //       const funcName = firstToUpper(name)
  //       const bodyName = `${funcName}Body`
  //       const paramsName = `${funcName}Params`
  //       const responseName = `${funcName}Res`
  //       const pathItem = {
  //         item,
  //         name,
  //         method,
  //         apiPath,
  //         bodyName,
  //         paramsName,
  //         responseName,
  //         moduleName: item.tags?.[0] ?? 'defalutModule'
  //       }
  //       this.pathItems.push(pathItem)
  //     }
  //   }
  // }

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

        // if (!funKeys.has(funInfo)) {
        //   funKeys.add(funInfo)
        // }
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
    // let name = ''

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
