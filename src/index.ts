import axios from 'axios'
import DocApi from './docApi'
import type { OpenAPIV3 } from 'openapi-types'

export default class OpenApi {
  json!: OpenAPIV3.Document
  docData!: DocApi

  constructor(private url: string) {
    this.init()
  }

  async init() {
    try {
      await this.getApiData()
      this.docData = new DocApi(this.json)
    } catch (error) {}
  }

  async getApiData() {
    try {
      const { data } = await axios.get<OpenAPIV3.Document>(this.url)
      this.json = data
    } catch (error) {
      console.error('获取数据异常')
    }
  }
}
