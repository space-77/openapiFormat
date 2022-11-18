import axios from 'axios'
import DocApi from './docApi'
import type { OpenAPIV3 } from 'openapi-types'

// export DocApi from './docApi'
// import path from 'path'

const converter = require('swagger2openapi')

async function getApiData(url: string): Promise<OpenAPIV3.Document> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.get(url)
      if (data.swagger === '2.0') {
        converter.convertObj(data, { components: true }, function (err: any, options: any) {
          if (err) {
            reject(err)
            return
          }
          resolve(options.openapi)
        })
      } else {
        resolve(data)
      }
    } catch (error) {
      reject(error)
    }
  })
}
// export type OpenAPI = OpenAPIV3
// export const OpenApiManage = DocApi

export default async function (url: string) {
  try {
    const json = await getApiData(url)

    return new DocApi(json)
  } catch (error) {
    return Promise.reject(error)
  }
}

// interface InitOps {
//   buildFuncs: () => void
//   buildTypes: () => void
// }

// export default class OpenApi {
//   // private initDone = false
//   private json!: OpenAPIV3.Document
//   private docData!: DocApi
//   private buildFuncs?: InitOps['buildFuncs']
//   private buildTypes?: InitOps['buildTypes']

//   constructor(private url: string) {
//     this.init()
//   }

//   private async init() {
//     try {
//       await this.getApiData()
//       this.docData = new DocApi(this.json)
//       // this
//       // console.log('99999999999')
//       this.docData.build()
//     } catch (error) {
//       console.error(error)
//     }
//   }

//   private async getApiData() {
//     this.json = require(path.join(__dirname, '../mock/swagger2openapi.json'))
//     // try {
//     //   const { data } = await axios.get<OpenAPIV3.Document>(this.url)
//     //   this.json = data
//     // } catch (error) {
//     //   console.error('获取数据异常')
//     // }
//   }

//   public start({ buildFuncs, buildTypes }: InitOps) {
//     this.buildFuncs = buildFuncs
//     this.buildTypes = buildTypes
//   }
// }
