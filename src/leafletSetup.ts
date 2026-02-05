import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'

// Fix default marker icon paths when bundling.
// See: https://leafletjs.com/examples/quick-start/
// (Vite doesn't automatically copy Leaflet's image assets unless referenced.)
//
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Some bundlers keep Leaflet's internal URL resolver around; removing it ensures
// our explicit URLs are used everywhere (including Leaflet.draw-created markers).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})
