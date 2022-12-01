import balanced from 'balanced-match'
import ComponentsBase from '../docApi/components/base'
import TypeItem from '../docApi/typeItem'
const isJsKeyword = require('is-es2016-keyword')

/**
 * @param str
 * @description 首字母大写
 */
export function firstToUpper(str: string) {
  return str.replace(/^(\S)/g, val => val.toUpperCase())
}

export function getMaxSamePath(paths: string[], samePath = ''): string {
  if (!paths.length || paths.some(path => !path.includes('/'))) return samePath

  const segs = paths.map(path => {
    const [firstSeg, ...restSegs] = path.split('/')
    return { firstSeg, restSegs }
  })

  if (segs.every((seg, index) => index === 0 || seg.firstSeg === segs[index - 1].firstSeg)) {
    return getMaxSamePath(
      segs.map(seg => seg.restSegs.join('/')),
      samePath + '/' + segs[0].firstSeg
    )
  }

  return samePath
}

export function getSamePath(paths: string[]) {
  let samePaths: string[] = []
  const pathItems = paths.map(path => path.split('/'))

  const minLength = Math.min(...pathItems.map(i => i.length))
  if (minLength <= 0) return samePaths.join('/')

  for (let i = 0; i < minLength; i++) {
    const consult = pathItems[0][i]
    const equal = pathItems.every(pathItem => pathItem[i] === consult)
    if (equal) {
      samePaths.push(consult)
    } else {
      break
    }
  }

  return samePaths.join('/')
}

export function toUpperFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function getIdentifierFromUrl(url: string, requestType: string, samePath = '') {
  const currUrl = url.slice(samePath.length)?.match(/([^\.]+)/)?.[0] as string

  return (
    requestType +
    currUrl
      .split('/')
      .map(str => {
        if (str.includes('-')) {
          str = str.replace(/(\-\w)+/g, (_match, p1) => {
            if (p1) return p1.slice(1).toUpperCase()
          })
        }

        if (str.match(/^{.+}$/gim)) {
          return 'By' + toUpperFirstLetter(str.slice(1, str.length - 1))
        }
        return toUpperFirstLetter(str)
      })
      .join('')
  )
}

export function formatRefTag(ref: string) {
  const startTag = '«'
  const endTag = '»'
  const reg = new RegExp(`${startTag}.+${endTag}`)
  if (!reg.test(ref)) return ref
  const { body } = balanced(startTag, endTag, ref) ?? {}
}

export function isObject(obj: any) {
  return (typeof obj === 'object' || typeof obj === 'function') && obj !== null
}

export function getEnumType(type: string, enumTypes: any[] = []) {
  if (enumTypes.length > 0) {
    if (type === 'string') return enumTypes.map(i => `"${i}"`).join(' | ')
    return enumTypes.join(' | ')
  }
  return type
}

export function checkName(name: string, checkFun: (name: string) => boolean): string {
  const hasName = checkFun(name)
  const lastNumReg = /((?!0)\d+)$/

  if (hasName) {
    let newName = ''
    if (!lastNumReg.test(name)) {
      newName = `${name}1`
    } else {
      newName = name.replace(lastNumReg, $1 => `${Number($1) + 1}`)
    }
    return checkName(newName, checkFun)
  }
  return name
}

const tsKeyword = new Set([
  'URL',
  'File',
  'Blob',
  'JSON',
  'Date',
  'Array',
  'String',
  'RegExp',
  'Object',
  'Number',
  'Boolean',
  'Promise',
  'Function',
  'ArrayBuffer',
  'URLSearchParams',

  // ts 映射类型  https://www.typescriptlang.org/docs/handbook/utility-types.html
  'Omit',
  'Pick',
  'Record',
  'Awaited',
  'Partial',
  'Exclude',
  'Extract',
  'Required',
  'ThisType',
  'Readonly',
  'Parameters',
  'ReturnType',
  'NonNullable',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ConstructorParameters'
])

/**
 * @description 监测需要定义的类型名字是不是Ts已经使用的名称，如 File, URL, URLSearchParams 等等
 */
export function checkTsTypeKeyword(typeName: string): string {
  if (tsKeyword.has(typeName)) return `My${typeName}`
  return typeName
}

export function transformCamelCase(name: string) {
  let words: string[] = []
  let result = ''

  if (name.includes('-')) {
    words = name.split('-')
  } else if (name.includes(' ')) {
    words = name.split(' ')
  } else {
    if (typeof name === 'string') {
      result = name
    } else {
      throw new Error('mod name is not a string: ' + name)
    }
  }

  if (words && words.length) {
    result = words
      .map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join('')
  }

  result = result.charAt(0).toLowerCase() + result.slice(1)

  if (result.endsWith('Controller')) {
    result = result.slice(0, result.length - 'Controller'.length)
  }

  return result
}
