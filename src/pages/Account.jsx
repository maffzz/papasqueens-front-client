import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../api/client'

export default function Account() {
  const { auth, login, logout } = useAuth()
  const { showToast } = useToast()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState({ lat: -12.0464, lng: -77.0428 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })

  async function fetchAddressFromCoords(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data && data.display_name) {
        setAddress(data.display_name)
      }
    } catch (e) {
      console.error('Error obteniendo dirección desde Nominatim:', e)
    }
  }

  async function searchAddress(ev) {
    ev?.preventDefault?.()
    const query = searchQuery.trim()
    if (!query) return

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query,
      )}&format=json&addressdetails=1&limit=1&countrycodes=pe&viewbox=-77.20,-11.90,-76.80,-12.20&bounded=1`
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0]
        const lat = parseFloat(first.lat)
        const lng = parseFloat(first.lon)
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setLocation({ lat, lng })
          if (first.display_name) {
            setAddress(first.display_name)
          }
        }
      }
    } catch (e) {
      console.error('Error buscando dirección en Nominatim:', e)
    }
  }

  async function fetchSearchSuggestions(text) {
    const q = text.trim()
    if (q.length < 3) {
      setSearchResults([])
      return
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q,
      )}&format=json&addressdetails=1&limit=5&countrycodes=pe&viewbox=-77.20,-11.90,-76.80,-12.20&bounded=1`
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setSearchResults(data)
      }
    } catch (e) {
      console.error('Error obteniendo sugerencias de Nominatim:', e)
    }
  }

  function LocationSelector() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        setLocation({ lat, lng })
        fetchAddressFromCoords(lat, lng)
      },
    })

    return null
  }

  useEffect(() => {
    if (!auth || !auth.id) return
    setName(auth.user || auth.name || '')
    setAddress(auth.address || auth.direccion || '')
    setPhone(auth.phone || '')
  }, [auth])

  if (!auth || !auth.id) {
    return (
      <main
        className="section"
        style={{
          minHeight: 'calc(100vh - 80px)',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 420,
            width: '100%',
            padding: '2rem 2.25rem',
            boxShadow: '0 18px 45px rgba(15,23,42,0.18)',
            borderRadius: '1.25rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '999px',
              margin: '0 auto 1rem',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            👤
          </div>
          <h1
            className="appTitle"
            style={{ color: '#03592e', marginBottom: '0.25rem', fontSize: 26 }}
          >
            Mi cuenta
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: '1.25rem' }}>
            Debes iniciar sesión para ver y editar tu perfil de entrega.
          </p>
          <button
            className="btn primary"
            style={{ width: '100%', height: '2.5rem' }}
            onClick={() => nav('/login')}
          >
            Ir a Login
          </button>
        </div>
      </main>
    )
  }

  async function onSubmit(ev) {
    ev.preventDefault()
    if (!address.trim()) {
      showToast({ type: 'warning', message: 'La dirección es obligatoria para poder hacer pedidos.' })
      return
    }
    try {
      setSaving(true)
      const payload = {
        name: name || auth.user || auth.name || auth.email,
        address: address.trim(),
        phone: phone.trim() || undefined,
        lat: location.lat,
        lng: location.lng,
      }
      const res = await api('/auth/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      const updatedAuth = {
        ...(auth || {}),
        user: res.name || payload.name,
        name: res.name || payload.name,
        email: res.email || auth.email,
        id: res.id_user || auth.id,
        tenant_id: res.tenant_id || auth.tenant_id,
        address: res.address || payload.address,
        phone: res.phone || payload.phone || '',
        lat: res.lat ?? auth.lat ?? location.lat,
        lng: res.lng ?? auth.lng ?? location.lng,
      }
      login(updatedAuth)
      showToast({ type: 'success', message: 'Datos actualizados correctamente.' })
    } catch (e) {
      console.error('Error actualizando perfil:', e)
      const msg = e.message || 'No se pudieron actualizar tus datos'
      showToast({ type: 'error', message: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      className="section"
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #fef9c3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.25rem',
      }}
    >
      <section
        className="container"
        style={{ maxWidth: 720, width: '100%' }}
      >
        <div
          className="card"
          style={{
            padding: '2.1rem 2.4rem 2rem',
            borderRadius: '1.75rem',
            boxShadow: '0 22px 55px rgba(15,23,42,0.20)',
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <header
            style={{
              marginBottom: '1.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div>
                <h1
                  className="appTitle"
                  style={{
                    color: '#03592e',
                    marginBottom: '0.45rem',
                    fontSize: 26,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Mi cuenta
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#64748b',
                    maxWidth: 420,
                  }}
                >
                  Actualiza tus datos y tu dirección de entrega para poder hacer pedidos sin problemas.
                </p>
              </div>
            </div>
            <button
              className="btn"
              style={{
                padding: '0.55rem 1.2rem',
                borderRadius: '999px',
                borderColor: '#bbf7d0',
                background: '#f0fdf4',
                color: '#065f46',
                whiteSpace: 'nowrap',
                fontSize: 13,
              }}
              onClick={() => {
                if (window.confirm('¿Quieres cerrar sesión?')) {
                  logout()
                  nav('/')
                }
              }}
            >
              Cerrar sesión
            </button>
          </header>

          <form
            onSubmit={onSubmit}
            className="list"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 1.5rem', marginTop: '0.25rem' }}
          >
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Nombre
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                style={{ borderRadius: 14 }}
              />
            </label>

            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Email
              <input
                className="input"
                value={auth.email || ''}
                readOnly
                style={{ borderRadius: 14, background: '#f9fafb' }}
              />
            </label>

            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                gridColumn: '1 / -1',
              }}
            >
              Dirección de entrega
              <textarea
                className="input"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ej: Av. Siempre Viva 123, Barranco, Lima"
                rows={2}
                required
                style={{
                  borderRadius: 14,
                  paddingTop: '0.55rem',
                  paddingBottom: '0.55rem',
                  resize: 'vertical',
                }}
              />
            </label>

            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <form
                onSubmit={searchAddress}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  className="input"
                  value={searchQuery}
                  onChange={e => {
                    const value = e.target.value
                    setSearchQuery(value)
                    fetchSearchSuggestions(value)
                  }}
                  placeholder="Buscar en el mapa (ej: calle, distrito, ciudad)"
                  style={{ borderRadius: 14, flex: 1, height: '2.5rem' }}
                />
                <button
                  type="submit"
                  className="btn"
                  style={{
                    height: '2.5rem',
                    paddingInline: '1.2rem',
                    borderRadius: 999,
                  }}
                >
                  Buscar
                </button>
              </form>

              {searchResults.length > 0 && (
                <div
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 4,
                    fontSize: 12,
                    zIndex: 10,
                  }}
                >
                  {searchResults.map(result => {
                    const lat = parseFloat(result.lat)
                    const lng = parseFloat(result.lon)
                    const key = `${result.place_id}-${result.osm_id}`
                    if (Number.isNaN(lat) || Number.isNaN(lng)) return null

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setLocation({ lat, lng })
                          if (result.display_name) {
                            setAddress(result.display_name)
                            setSearchQuery(result.display_name)
                          }
                          setSearchResults([])
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.5rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {result.display_name}
                      </button>
                    )
                  })}
                </div>
              )}

              <div
                style={{
                  height: 260,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                }}
              >
                <MapContainer
                  center={[location.lat, location.lng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector />
                  <Marker
                    position={[location.lat, location.lng]}
                    draggable
                    icon={markerIcon}
                    eventHandlers={{
                      dragend: e => {
                        const marker = e.target
                        const { lat, lng } = marker.getLatLng()
                        setLocation({ lat, lng })
                        fetchAddressFromCoords(lat, lng)
                      },
                    }}
                  />
                </MapContainer>
              </div>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Teléfono (opcional)
              <input
                className="input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 999 999 999"
                style={{ borderRadius: 14 }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                gridColumn: '2 / 3',
                marginTop: 0,
              }}
            >
              <button
                className="btn primary"
                type="submit"
                disabled={saving}
                style={{
                  minWidth: 180,
                  height: '2.6rem',
                  borderRadius: '999px',
                }}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e5e7eb',
              fontSize: 11,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span>
              La dirección de entrega es <strong>obligatoria</strong> para poder crear pedidos.
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
