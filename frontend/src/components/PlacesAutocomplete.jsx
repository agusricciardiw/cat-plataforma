/**
 * PlacesAutocomplete.jsx
 * Input con Google Places Autocomplete restringido a CABA.
 * - Input no controlado por React (Google maneja el DOM)
 * - Restricción geográfica a Ciudad Autónoma de Buenos Aires
 * - Filtra resultados fuera de CABA al seleccionar
 */
import { useEffect, useRef } from 'react'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Bounds ajustados exactos de CABA
const CABA_BOUNDS = {
  sw: { lat: -34.7050, lng: -58.5316 },
  ne: { lat: -34.5270, lng: -58.3351 },
}

let mapsReady = false
let mapsLoading = false
const readyCallbacks = []

export function onMapsReady(cb) {
  if (window.google?.maps?.places) { cb(); return }
  readyCallbacks.push(cb)
  if (mapsLoading) return
  mapsLoading = true
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,drawing,geometry&language=es`
  script.async = true
  script.defer = true
  script.onload = () => {
    mapsReady = true
    readyCallbacks.forEach(fn => fn())
    readyCallbacks.length = 0
  }
  document.head.appendChild(script)
}

/**
 * Geocodifica un texto de dirección usando la Geocoding API.
 * Retorna { lat, lng } o null.
 */
export async function geocodeAddress(address) {
  if (!window.google?.maps) return null
  return new Promise(resolve => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode(
      { address: address + ', Ciudad Autónoma de Buenos Aires, Argentina' },
      (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          })
        } else {
          resolve(null)
        }
      }
    )
  })
}

export default function PlacesAutocomplete({
  value = '',
  onChange,
  placeholder = 'Buscar dirección…',
  disabled = false,
  style = {},
}) {
  const inputRef = useRef(null)
  const acRef    = useRef(null)
  const hasFocus = useRef(false)

  // Sync valor externo → DOM solo cuando no tiene foco
  useEffect(() => {
    const el = inputRef.current
    if (!el || hasFocus.current) return
    el.value = value ?? ''
  }, [value])

  useEffect(() => {
    if (!MAPS_KEY) return

    function init() {
      const el = inputRef.current
      if (!el || acRef.current) return

      el.value = value ?? ''

      acRef.current = new window.google.maps.places.Autocomplete(el, {
        componentRestrictions: { country: 'ar' },
        bounds: new window.google.maps.LatLngBounds(
          CABA_BOUNDS.sw,
          CABA_BOUNDS.ne
        ),
        strictBounds: true,          // Solo muestra resultados dentro del bounding box
        fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
        types: ['address'],
      })

      acRef.current.addListener('place_changed', () => {
        const place = acRef.current.getPlace()
        if (!place) return

        // Extraer nombre de calle limpio (sin número, ciudad, país)
        let streetName = el.value
        if (place.address_components) {
          const route = place.address_components.find(c => c.types.includes('route'))
          if (route) streetName = route.long_name
        }

        const addr = streetName || place.formatted_address || place.name || el.value
        el.value = addr

        if (place.geometry) {
          onChange?.(addr, {
            place_id: place.place_id,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            formatted_address: place.formatted_address,
          })
        } else {
          onChange?.(addr)
        }

        hasFocus.current = false
      })
    }

    onMapsReady(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      style={style}
      onFocus={() => { hasFocus.current = true }}
      onBlur={e => {
        hasFocus.current = false
        onChange?.(e.target.value)
      }}
      onChange={e => onChange?.(e.target.value)}
    />
  )
}
