export const extractSvgTextFromDataUrl = (dataUrl: string) => {
  if (!dataUrl.startsWith('data:image/svg+xml')) return null
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex === -1) return null
  const payload = dataUrl.slice(commaIndex + 1)
  if (dataUrl.includes(';base64,')) {
    try {
      return atob(payload)
    } catch {
      return null
    }
  }
  try {
    return decodeURIComponent(payload)
  } catch {
    return null
  }
}

export const parseSvgDimensions = (svgText: string) => {
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([^"]+)"/i)
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map((v) => Number.parseFloat(v))
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return { width: Math.max(1, parts[2]), height: Math.max(1, parts[3]) }
    }
  }

  const widthMatch = svgText.match(/width\s*=\s*"([^"]+)"/i)
  const heightMatch = svgText.match(/height\s*=\s*"([^"]+)"/i)
  const parseDim = (value?: string | null) => {
    if (!value) return null
    const numeric = Number.parseFloat(value.replace(/px/i, '').trim())
    return Number.isFinite(numeric) ? numeric : null
  }

  const width = parseDim(widthMatch?.[1])
  const height = parseDim(heightMatch?.[1])
  if (width && height) {
    return { width, height }
  }

  return null
}

export const buildSvgDataUrl = (svgText: string) => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
}
