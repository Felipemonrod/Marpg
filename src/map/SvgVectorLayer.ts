import L from 'leaflet'

/**
 * SVG Vector Layer for true vector rendering with infinite zoom quality
 * Converts SVG elements to Leaflet vector paths for crisp rendering at all zoom levels
 */
export default class SvgVectorLayer extends L.LayerGroup {
  private svgText: string
  private width: number
  private height: number
  private svgPaths: L.Path[] = []

  constructor(svgText: string, width: number, height: number) {
    super()
    this.svgText = svgText
    this.width = width
    this.height = height
    this.parseSvgToPaths()
  }

  /**
   * Parse SVG text and convert elements to Leaflet paths
   */
  private parseSvgToPaths() {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(this.svgText, 'image/svg+xml')
    const svgElement = svgDoc.documentElement

    if (svgElement.tagName !== 'svg') {
      console.error('Invalid SVG document')
      return
    }

    // Parse viewBox to get coordinate system
    const viewBox = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number) || [0, 0, this.width, this.height]
    const [vbX, vbY, vbWidth, vbHeight] = viewBox

    // Process all SVG elements recursively
    this.processElement(svgElement, vbX, vbY, vbWidth, vbHeight)
  }

  /**
   * Recursively process SVG elements and convert to Leaflet paths
   */
  private processElement(element: Element, vbX: number, vbY: number, vbWidth: number, vbHeight: number, parentStyle: any = {}) {
    const tagName = element.tagName.toLowerCase()

    // Get computed style for this element
    const style = this.getElementStyle(element, parentStyle)

    // Process based on element type
    switch (tagName) {
      case 'rect':
        this.createRectangle(element, style)
        break
      case 'circle':
        this.createCircle(element, style)
        break
      case 'ellipse':
        this.createEllipse(element, style)
        break
      case 'line':
        this.createLine(element, style)
        break
      case 'polyline':
      case 'polygon':
        this.createPolygon(element, style, tagName === 'polygon')
        break
      case 'path':
        this.createPath(element, style)
        break
      case 'text':
        // Text elements require special handling - use SVG overlay for now
        this.createTextMarker(element, style)
        break
      case 'image':
        // Embedded images
        this.createImageOverlay(element)
        break
      case 'g':
      case 'svg':
        // Process children for groups and nested SVGs
        Array.from(element.children).forEach(child => {
          this.processElement(child, vbX, vbY, vbWidth, vbHeight, style)
        })
        break
    }
  }

  /**
   * Convert SVG coordinates to Leaflet coordinates
   */
  private svgToLeaflet(x: number, y: number): L.LatLng {
    // Leaflet uses negative Y for moving south
    return L.latLng(-y, x)
  }

  /**
   * Get style properties from SVG element
   */
  private getElementStyle(element: Element, parentStyle: any): any {
    const style: any = { ...parentStyle }

    // Parse stroke
    const stroke = element.getAttribute('stroke')
    if (stroke && stroke !== 'none') {
      style.color = stroke
    }

    // Parse stroke-width
    const strokeWidth = element.getAttribute('stroke-width')
    if (strokeWidth) {
      style.weight = parseFloat(strokeWidth)
    }

    // Parse fill
    const fill = element.getAttribute('fill')
    if (fill && fill !== 'none') {
      style.fillColor = fill
      style.fill = true
    } else if (fill === 'none') {
      style.fill = false
    }

    // Parse opacity
    const opacity = element.getAttribute('opacity')
    if (opacity) {
      style.opacity = parseFloat(opacity)
    }

    const fillOpacity = element.getAttribute('fill-opacity')
    if (fillOpacity) {
      style.fillOpacity = parseFloat(fillOpacity)
    }

    const strokeOpacity = element.getAttribute('stroke-opacity')
    if (strokeOpacity) {
      style.opacity = parseFloat(strokeOpacity)
    }

    return style
  }

  /**
   * Create rectangle from SVG <rect>
   */
  private createRectangle(element: Element, style: any) {
    const x = parseFloat(element.getAttribute('x') || '0')
    const y = parseFloat(element.getAttribute('y') || '0')
    const width = parseFloat(element.getAttribute('width') || '0')
    const height = parseFloat(element.getAttribute('height') || '0')

    const bounds = L.latLngBounds(
      this.svgToLeaflet(x, y),
      this.svgToLeaflet(x + width, y + height)
    )

    const rect = L.rectangle(bounds, style)
    this.addLayer(rect)
    this.svgPaths.push(rect)
  }

  /**
   * Create circle from SVG <circle>
   */
  private createCircle(element: Element, style: any) {
    const cx = parseFloat(element.getAttribute('cx') || '0')
    const cy = parseFloat(element.getAttribute('cy') || '0')
    const r = parseFloat(element.getAttribute('r') || '0')

    const circle = L.circle(this.svgToLeaflet(cx, cy), { ...style, radius: r })
    this.addLayer(circle)
    this.svgPaths.push(circle)
  }

  /**
   * Create ellipse from SVG <ellipse>
   */
  private createEllipse(element: Element, style: any) {
    const cx = parseFloat(element.getAttribute('cx') || '0')
    const cy = parseFloat(element.getAttribute('cy') || '0')
    const rx = parseFloat(element.getAttribute('rx') || '0')
    const ry = parseFloat(element.getAttribute('ry') || '0')

    // Approximate ellipse with circle using average radius (Leaflet doesn't have native ellipse)
    const avgRadius = (rx + ry) / 2
    const circle = L.circle(this.svgToLeaflet(cx, cy), { ...style, radius: avgRadius })
    this.addLayer(circle)
    this.svgPaths.push(circle)
  }

  /**
   * Create line from SVG <line>
   */
  private createLine(element: Element, style: any) {
    const x1 = parseFloat(element.getAttribute('x1') || '0')
    const y1 = parseFloat(element.getAttribute('y1') || '0')
    const x2 = parseFloat(element.getAttribute('x2') || '0')
    const y2 = parseFloat(element.getAttribute('y2') || '0')

    const line = L.polyline([this.svgToLeaflet(x1, y1), this.svgToLeaflet(x2, y2)], style)
    this.addLayer(line)
    this.svgPaths.push(line)
  }

  /**
   * Create polygon/polyline from SVG <polygon> or <polyline>
   */
  private createPolygon(element: Element, style: any, closed: boolean) {
    const pointsStr = element.getAttribute('points') || ''
    const points = pointsStr.trim().split(/[\s,]+/).map(Number)

    const latlngs: L.LatLng[] = []
    for (let i = 0; i < points.length; i += 2) {
      if (i + 1 < points.length) {
        latlngs.push(this.svgToLeaflet(points[i], points[i + 1]))
      }
    }

    const poly = closed ? L.polygon(latlngs, style) : L.polyline(latlngs, style)
    this.addLayer(poly)
    this.svgPaths.push(poly)
  }

  /**
   * Create path from SVG <path> (simplified - handles basic commands)
   */
  private createPath(element: Element, style: any) {
    const d = element.getAttribute('d') || ''
    
    // This is a simplified parser. For full SVG path support, consider using a library like svg-path-parser
    // For now, we'll handle basic M (moveto) and L (lineto) commands
    
    const commands = d.match(/[MLHVZCSQTAmlhvzcsqta][^MLHVZCSQTAmlhvzcsqta]*/g) || []
    const points: L.LatLng[] = []
    let currentX = 0
    let currentY = 0

    commands.forEach(cmd => {
      const type = cmd[0]
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number)

      switch (type.toUpperCase()) {
        case 'M': // Move to
          if (coords.length >= 2) {
            currentX = type === 'M' ? coords[0] : currentX + coords[0]
            currentY = type === 'M' ? coords[1] : currentY + coords[1]
            points.push(this.svgToLeaflet(currentX, currentY))
          }
          break
        case 'L': // Line to
          if (coords.length >= 2) {
            currentX = type === 'L' ? coords[0] : currentX + coords[0]
            currentY = type === 'L' ? coords[1] : currentY + coords[1]
            points.push(this.svgToLeaflet(currentX, currentY))
          }
          break
        case 'H': // Horizontal line
          if (coords.length >= 1) {
            currentX = type === 'H' ? coords[0] : currentX + coords[0]
            points.push(this.svgToLeaflet(currentX, currentY))
          }
          break
        case 'V': // Vertical line
          if (coords.length >= 1) {
            currentY = type === 'V' ? coords[0] : currentY + coords[0]
            points.push(this.svgToLeaflet(currentX, currentY))
          }
          break
        case 'Z': // Close path
          if (points.length > 0) {
            points.push(points[0])
          }
          break
      }
    })

    if (points.length > 1) {
      const polyline = L.polyline(points, style)
      this.addLayer(polyline)
      this.svgPaths.push(polyline)
    }
  }

  /**
   * Create text marker from SVG <text>
   * Note: This uses DivIcon which may not scale perfectly, but provides basic text support
   */
  private createTextMarker(element: Element, style: any) {
    const x = parseFloat(element.getAttribute('x') || '0')
    const y = parseFloat(element.getAttribute('y') || '0')
    const text = element.textContent || ''

    const fontSize = element.getAttribute('font-size') || '12'
    const fontFamily = element.getAttribute('font-family') || 'Arial'
    const fill = element.getAttribute('fill') || style.fillColor || '#000000'

    const icon = L.divIcon({
      html: `<div style="font-size: ${fontSize}px; font-family: ${fontFamily}; color: ${fill}; white-space: nowrap;">${text}</div>`,
      className: 'svg-text-label',
      iconSize: undefined as any,
    })

    const marker = L.marker(this.svgToLeaflet(x, y), { icon })
    this.addLayer(marker)
  }

  /**
   * Create image overlay from SVG <image>
   */
  private createImageOverlay(element: Element) {
    const x = parseFloat(element.getAttribute('x') || '0')
    const y = parseFloat(element.getAttribute('y') || '0')
    const width = parseFloat(element.getAttribute('width') || '0')
    const height = parseFloat(element.getAttribute('height') || '0')
    const href = element.getAttribute('href') || element.getAttribute('xlink:href') || ''

    if (href) {
      const bounds = L.latLngBounds(
        this.svgToLeaflet(x, y),
        this.svgToLeaflet(x + width, y + height)
      )

      const overlay = L.imageOverlay(href, bounds)
      this.addLayer(overlay)
    }
  }

  /**
   * Clear all paths
   */
  public clearPaths() {
    this.svgPaths.forEach(path => this.removeLayer(path))
    this.svgPaths = []
  }

  /**
   * Update SVG content
   */
  public updateSvg(svgText: string, width: number, height: number) {
    this.clearPaths()
    this.svgText = svgText
    this.width = width
    this.height = height
    this.parseSvgToPaths()
  }
}
