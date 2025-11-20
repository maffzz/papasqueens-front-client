const API_BASE = 'https://id8sfymfb7.execute-api.us-east-1.amazonaws.com/dev'

function getAuth() { try { return JSON.parse(localStorage.getItem('auth') || '{}') } catch { return {} } }
function setAuth(a) { localStorage.setItem('auth', JSON.stringify(a || {})) }

function getTenantId() {
  try {
    // Prioridad: localStorage > variable de entorno > valor por defecto
    return localStorage.getItem('tenantId') 
      || (import.meta && import.meta.env && import.meta.env.VITE_TENANT_ID)
      || 'tenant_pq_barranco' // Valor por defecto que funciona
  } catch { return 'tenant_pq_barranco' }
}
function setTenantId(id) { try { if (id) localStorage.setItem('tenantId', id); else localStorage.removeItem('tenantId') } catch {} }

async function api(path, opts = {}) {
  const auth = getAuth()
  const { token, id, email, type } = auth || {}
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {})
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (id) headers['X-User-Id'] = id
  if (email) headers['X-User-Email'] = email
  if (type) headers['X-User-Type'] = type
  const tenant = opts.tenantId || getTenantId()
  if (tenant && !headers['X-Tenant-Id'] && !headers['x-tenant-id']) headers['X-Tenant-Id'] = tenant
  let url = `${API_BASE}${path}`
  if (tenant && opts.tenantAsQuery === true) url += (url.includes('?') ? '&' : '?') + `tenant_id=${encodeURIComponent(tenant)}`
  const res = await fetch(url, Object.assign({}, opts, { headers }))
  if (!res.ok) {
    // En app de cliente, NO redirigimos a /login en 401/403
    let text
    try {
      text = await res.text()
    } catch {
      text = ''
    }

    let message = text || `Error HTTP ${res.status}`
    // Intentar extraer mensaje legible desde JSON
    const idx = text.indexOf('{')
    if (idx !== -1) {
      const jsonPart = text.slice(idx).trim()
      if (jsonPart.startsWith('{')) {
        try {
          let parsed = JSON.parse(jsonPart)
          if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
            try { parsed = JSON.parse(parsed.trim()) } catch {}
          }
          if (parsed && typeof parsed.error === 'string') {
            message = parsed.error
          } else if (parsed && typeof parsed.message === 'string') {
            message = parsed.message
          }
        } catch {
          // dejamos message como estaba
        }
      }
    }

    throw new Error(message)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

function formatPrice(n) { try { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n) } catch { return `S/ ${n}` } }

// Distancia en metros entre dos coordenadas
function haversine(a, b) {
  if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') return 0
  const R = 6371000
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat), la2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '—'
  const m = Math.round(seconds / 60)
  if (m < 1) return '<1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), mm = m % 60
  return `${h} h ${mm} min`
}

export { api, getAuth, setAuth, getTenantId, setTenantId, API_BASE, formatPrice, haversine, formatDuration }
