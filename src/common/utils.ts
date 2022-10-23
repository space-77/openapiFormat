import balanced from 'balanced-match'

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
