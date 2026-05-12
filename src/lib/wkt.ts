import wellknown from 'wellknown'
import type { LatLngExpression } from 'leaflet'

export type PolygonLatLngs = LatLngExpression[][]

export function wktToLeafletPolygon(wkt: string): PolygonLatLngs | null {
  if (!wkt) return null
  const g = wellknown.parse(wkt) as any
  if (!g) return null

  // WKT is expected in lon/lat (x/y). Leaflet wants lat/lng.
  if (g.type === 'Polygon') {
    const rings = (g.coordinates as number[][][]).map((ring) => ring.map(([x, y]) => [y, x] as LatLngExpression))
    return rings as PolygonLatLngs
  }

  if (g.type === 'MultiPolygon') {
    const poly = (g.coordinates as number[][][][])[0]
    if (!poly) return null
    const rings = poly.map((ring) => ring.map(([x, y]) => [y, x] as LatLngExpression))
    return rings as PolygonLatLngs
  }

  return null
}

export function rectangleWktFromBounds(minLng: number, minLat: number, maxLng: number, maxLat: number) {
  const p1 = `${minLng} ${minLat}`
  const p2 = `${maxLng} ${minLat}`
  const p3 = `${maxLng} ${maxLat}`
  const p4 = `${minLng} ${maxLat}`
  return `POLYGON((${p1}, ${p2}, ${p3}, ${p4}, ${p1}))`
}

