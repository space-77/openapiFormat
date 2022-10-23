import fs from 'fs'
import path from 'path'
import { openapiGenerate, Result } from 'openapi'

const filePath = path.join(__dirname, '../../mock/openapi2.json')
~(async () => {
  const res = openapiGenerate({ file: filePath }) as unknown as Promise<any>
  const { code, types } = await res
  // console.log(code, types)

  fs.writeFileSync(path.join(__dirname, '../../output/index.js'), code)
  fs.writeFileSync(path.join(__dirname, '../../output/index.d.ts'), types)
})()
