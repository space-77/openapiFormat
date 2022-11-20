import fs from 'fs'
import { HttpMethods, httpMethods } from '../common'
// import FunInfo from './funInfo'
import Components from './components'
import type { OpenAPIV3 } from 'openapi-types'
import { firstToUpper, getGenericsType, getIdentifierFromUrl, getMaxSamePath } from '../common/utils'
// import isKeyword from 'is-es2016-keyword'
import { OperationObject } from '../types/openapi'
import { ComponentsChildBase } from './type'
import path from 'path'

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
  responseType?: ComponentsChildBase
  parameterType?: ComponentsChildBase
  requestBodyType?: ComponentsChildBase
}

export type FuncGroupList = {
  moduleName: string
  description?: string
  funcInfoList: PathItem[]
}

export default class DocApi {
  // 相同的路径
  private samePath = ''
  private pathItems: PathItem[] = []
  components!: Components
  get funcGroupList() {
    const funcGroupList: FuncGroupList[] = []
    const { pathItems, json } = this
    const { tags = [] } = json

    for (const pathItem of pathItems) {
      const { moduleName } = pathItem
      const funcInfo = funcGroupList.find(i => i.moduleName === moduleName)
      if (!funcInfo) {
        const { description } = tags.find(i => i.name === moduleName) ?? {}
        funcGroupList.push({ moduleName, description, funcInfoList: [pathItem] })
      } else {
        funcInfo.funcInfoList.push(pathItem)
      }
    }
    return funcGroupList
  }
  // apiFunInfos: FunInfo[] = []

  constructor(private json: OpenAPIV3.Document) {
    // 1、先收集数据
    // 2、再整理数据
    this.formatFuns()
    this.formatTypes()
  }

  // private buildTsFile() {
  //   let content = 'class Api {'
  //   for (const itemInfo of this.pathItems) {
  //     const { name, item, parameterType, requestBodyType, responseType } = itemInfo
  //     const { deprecated, description } = item
  //     const descriptionStr = `
  // /**${deprecated ? '\n * @deprecated' : ''}
  //  * @description ${description || ''}
  //  */\n`
  //     const paramsType = `params: ${parameterType?.name}`
  //     content += `\n ${descriptionStr} ${name}(${paramsType}): ${responseType?.name}{\n}\n`
  //   }
  //   content += '}'

  //   fs.writeFileSync(path.join(__dirname, '../../mock/funApi.ts'), content)
  // }

  // private buildTdDFile() {
  //   let content = ''
  //   for (const typeInfo of this.components.typeList) {
  //     const [typeName, { typeItems, description, refValues }] = typeInfo
  //     // console.log(typeInfo)
  //     content += `interface ${typeName} ${refValues.length > 0 ? ` extends ${refValues.map(i => i.typeName).join(',')}` : ''} {\n`
  //     // const {  } = typeItems
  //     typeItems.sort((a, b) => a.name.length - b.name.length)
  //     for (const typeItem of typeItems) {
  //       const { name, type, example, enumTypes, required, genericsItem } = typeItem
  //       const typeValue = typeof type === 'string' ? type : type?.typeName

  //       const genericsType = getGenericsType(genericsItem, enumTypes)

  //       content += `${name.replace(/-/g, '_')}${required ? '' : '?'}:${typeValue}${genericsType}\n`
  //     }
  //     content += '}\n'
  //   }

  //   fs.writeFileSync(path.join(__dirname, '../../mock/index.d.ts'), content)
  // }

  // public build() {
  //   // this.buildTsFile()
  //   this.buildTdDFile()
  // }

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
        const item = pathsObject[method] as OperationObject | undefined
        if (!item) continue
        const name = this.createFunName(apiPath, method, item.operationId)
        // FIXME 参数类型 和 返回体类型 的名字需要整理成同一
        const funcName = firstToUpper(name)
        const bodyName = `${funcName}Body`
        const paramsName = `${funcName}Params`
        const responseName = `${funcName}Res`
        const pathItem = {
          item,
          name,
          method,
          apiPath,
          bodyName,
          paramsName,
          responseName,
          moduleName: item.tags?.[0] ?? 'defalutModule'
        }
        this.pathItems.push(pathItem)
        // const {  } = pathItem

        // const funInfo = new FunInfo(this, apiPath, method, item, this.samePath)
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
