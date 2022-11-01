import balanced from 'balanced-match'
import { ComponentsChildBase } from '../docApi/type'
import TypeItem, { TypeItemOption } from '../docApi/typeItem'

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

export function getGenerics4TypeItem(item: TypeItem): string {
  // console.log({ enumTypes })
  const { type, genericsItem, enumTypes } = item
  if (genericsItem) {
    if (genericsItem instanceof TypeItem) {
      return `<${type}<${getGenerics4TypeItem(genericsItem)}>>`
    } else if (typeof genericsItem === 'string') {
      return `<${type}<${genericsItem}>>`
    } else {
      const { typeName } = genericsItem
      return `<${type}<${typeName}>>`
    }
  } else if (typeof type === 'string') {
    return `<${getEnumType(type, enumTypes)}>`
  }
  console.log(JSON.stringify(item))
  return ''
}

export function getGenericsType(generics: TypeItemOption['genericsItem'], enumTypes: any[] = []) {
  // console.log(enumTypes, generics)
  if (!generics) return ''

  // console.log(enumTypes)

  // console.log(JSON.stringify(generics))

  if (typeof generics === 'string') {
    return `<${getEnumType(generics, enumTypes)}>`
  } else if (generics instanceof TypeItem) {
    // 泛型 为 schema 类型,
    // TODO 泛型包泛型
    return getGenerics4TypeItem(generics)
  }
  // 泛型 为 引用类型
  const { typeName } = generics as ComponentsChildBase
  return `<${typeName}>`
}
