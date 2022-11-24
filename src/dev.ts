import docInit from './index'
// import api from '../output'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import balanced from 'balanced-match'

// openapi3 中文文档 https://www.cnblogs.com/yaohl0911/p/14567915.html

// console.log(balanced("«", "»", "通用响应体«List«MyBatisDemo响应体»»"));

// const str = '我#获取我一#特殊符号#获取我二#之间#获取我三#的内容'
// const pattern = /#(.+?)#/g
// const text = str.match(pattern) ?? ''
// console.log(text.toString().replace(/(#)/g, ''))

// https://generator3.swagger.io/index.html
const url = 'https://generator3.swagger.io/openapi.json'
// const openapi = new OpenApi(url)
docInit(url)

// openapi.start({})
// openapi.

// const isChinese = require('is-chinese')

// console.log(isChinese('a中文'));

// swagger 格式转 openapi
// const converter = require('swagger2openapi')
// ~(async () => {
//   try {
//     const url = 'http://114.115.202.183:8088/v2/api-docs'
//     const { data } = await axios.get(url)
//     converter.convertObj(data, { components: true }, function (err: any, options: any) {
//       if (err) return
//       fs.writeFileSync(path.join(__dirname, '../mock/swagger2openapi2.json'), JSON.stringify(options.openapi))
//     })
//   } catch (error) {
//     console.error(error)
//   }
// })()
