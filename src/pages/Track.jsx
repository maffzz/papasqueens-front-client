import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatPrice, haversine, formatDuration, getTenantId } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import L from 'leaflet'

const TENANT_ORIGINS = {
  tenant_pq_barranco: { lat: -12.1372, lng: -77.0220 },
  tenant_pq_puruchuco: { lat: -12.0325, lng: -76.9302 },
  tenant_pq_vmt: { lat: -12.1630, lng: -76.9635 },
  tenant_pq_jiron: { lat: -12.0560, lng: -77.0370 },
}

// Ícono personalizado para el delivery (repartidor)
const deliveryIcon = L.divIcon({
  className: 'delivery-marker',
  html: `<div style="
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    animation: pulse 2s infinite;
  ">🛵</div>
  <style>
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  </style>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
})

// Ícono para el destino (casa del cliente)
const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: `<div style="
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  ">🏠</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
})

// Ícono para el origen (restaurante)
const originIcon = L.divIcon({
  className: 'origin-marker',
  html: `<div style="
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  ">🍽️</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
})

export default function Track() {
  const [sp] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [id, setId] = useState(sp.get('id') || '')
  const [err, setErr] = useState('')
  const [deliveryId, setDeliveryId] = useState(sp.get('delivery') || '')
  const [orderDetails, setOrderDetails] = useState(null)
  const [custId, setCustId] = useState('')
  const [custOrders, setCustOrders] = useState([])
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const polyRef = useRef(null)
  const routeRef = useRef(null)
  const lastPointRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const mockAnimationRef = useRef(null)
  const mockRoutePointsRef = useRef([])
  const mockCurrentIndexRef = useRef(0)
  const [useMockRoute, setUseMockRoute] = useState(false)
  const { showToast } = useToast()
  const { auth } = useAuth()

  function canCancelStatus(st) {
    if (!st) return false
    const s = String(st).toLowerCase()
    return s === 'recibido'
  }

  async function fetchOrder(oid) {
    if (!oid || !oid.trim()) {
      setErr('Por favor ingresa un ID de pedido válido')
      return
    }
    try {
      setErr('')
      console.log('Consultando pedido:', oid)
      const data = await api(`/orders/${encodeURIComponent(oid)}/status`)
      setOrder(data || {})
      showToast({ type: 'success', message: 'Pedido encontrado' })
      try { 
        const det = await api(`/orders/${encodeURIComponent(oid)}`)
        setOrderDetails(det || {}) 
      } catch (e) {
        console.warn('No se pudo obtener detalles completos:', e)
      }
      const d = data || {}
      const maybe = d.id_delivery || d.delivery_id || (d.delivery && (d.delivery.id_delivery || d.delivery.id))
      if (maybe && !deliveryId) {
        setDeliveryId(String(maybe))
        await fetchTrack(String(maybe))
      }
    } catch (e) { 
      console.error('Error consultando pedido:', e)
      setOrder(null)
      setOrderDetails(null)
      const errorMsg = e.message || 'Error consultando el estado del pedido'
      setErr(errorMsg)
      showToast({ type: 'error', message: errorMsg })
    }
  }

  useEffect(() => { if (id) fetchOrder(id) }, [])

  function onSubmit(ev) { ev.preventDefault(); if (id) fetchOrder(id) }

  // Función para generar puntos intermedios en una ruta (interpolación)
  function generateRoutePoints(start, end, numPoints = 30) {
    const points = []
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints
      // Interpolación lineal con pequeñas variaciones aleatorias para simular calles
      const lat = start.lat + (end.lat - start.lat) * ratio + (Math.random() - 0.5) * 0.001
      const lng = start.lng + (end.lng - start.lng) * ratio + (Math.random() - 0.5) * 0.001
      points.push({ lat, lng })
    }
    return points
  }

  // Función para iniciar la animación mock del delivery
  function startMockAnimation() {
    const tenantId = getTenantId()
    const origin = TENANT_ORIGINS[tenantId]
    const destLatRaw = orderDetails && (orderDetails.dest_lat ?? orderDetails.destLat)
    const destLngRaw = orderDetails && (orderDetails.dest_lng ?? orderDetails.destLng)
    const destLat = destLatRaw != null ? Number(destLatRaw) : null
    const destLng = destLngRaw != null ? Number(destLngRaw) : null

    if (!origin || !isFinite(destLat) || !isFinite(destLng)) {
      console.log('No se puede iniciar seguimiento: falta origen o destino')
      return
    }

    // Generar ruta mock con más puntos para movimiento más suave
    mockRoutePointsRef.current = generateRoutePoints(origin, { lat: destLat, lng: destLng }, 60)
    mockCurrentIndexRef.current = 0
    setUseMockRoute(true)

    // Limpiar animación anterior si existe
    if (mockAnimationRef.current) {
      clearInterval(mockAnimationRef.current)
    }

    // Animar el movimiento (actualizar cada 2 segundos)
    mockAnimationRef.current = setInterval(() => {
      if (mockCurrentIndexRef.current < mockRoutePointsRef.current.length - 1) {
        mockCurrentIndexRef.current++
        const currentPoints = mockRoutePointsRef.current.slice(0, mockCurrentIndexRef.current + 1)
        renderTrack({ points: currentPoints })
      } else {
        // Llegó al destino
        clearInterval(mockAnimationRef.current)
        mockAnimationRef.current = null
        showToast({ type: 'success', message: '🎉 ¡Tu pedido ha llegado!' })
      }
    }, 1500) // Actualizar cada 1.5 segundos para que sea más fluido
  }

  // Función para detener la animación mock
  function stopMockAnimation() {
    if (mockAnimationRef.current) {
      clearInterval(mockAnimationRef.current)
      mockAnimationRef.current = null
    }
    setUseMockRoute(false)
    mockRoutePointsRef.current = []
    mockCurrentIndexRef.current = 0
    renderTrack({ points: [] })
  }

  async function fetchTrack(idDel) {
    // Si está en modo mock, no hacer fetch real
    if (useMockRoute) return

    try {
      console.log('Consultando tracking para delivery:', idDel)
      const data = await api(`/delivery/${encodeURIComponent(idDel)}/track`)
      console.log('Datos de tracking recibidos:', data)
      // El backend devuelve last_location: {lat, lon} o puede devolver un array de points
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          renderTrack({ points: data })
        } else if (data.lat !== undefined && data.lon !== undefined) {
          // Backend devuelve solo last_location como {lat, lon}
          renderTrack({ points: [{ lat: data.lat, lng: data.lon }] })
        } else if (data.points) {
          renderTrack(data)
        } else {
          renderTrack({ points: [] })
        }
      } else {
        renderTrack({ points: [] })
      }
    } catch (e) {
      console.error('Error obteniendo tracking:', e)
      const wrap = document.getElementById('cust-track-view');
      if (wrap) wrap.innerHTML = '<div class="card">No hay tracking disponible aún</div>'
    }
  }

  async function cancelOrder() {
    if (!id) {
      showToast({ type: 'warning', message: 'No hay pedido seleccionado' })
      return
    }
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return
    try {
      console.log('Cancelando pedido:', id)
      await api(`/orders/${encodeURIComponent(id)}/cancel`, { method:'POST' })
      showToast({ type:'success', message:'Pedido cancelado exitosamente' })
      await fetchOrder(id)
    } catch (e) {
      console.error('Error al cancelar:', e)
      const errorMsg = e.message || 'No se pudo cancelar el pedido'
      showToast({ type:'error', message: errorMsg })
    }
  }

  async function fetchCustomerOrders(ev) {
    ev.preventDefault()
    const { auth } = useAuth()
    const customerIdToUse = custId?.trim() || auth?.id
    if (!customerIdToUse) { 
      showToast({ type:'warning', message:'Ingresa un ID de cliente o inicia sesión' })
      return 
    }
    try {
      console.log('Buscando pedidos del cliente:', customerIdToUse)
      // El backend espera el id_customer en el path y usa el X-User-Id del header para validar
      const data = await api(`/orders/customer/${encodeURIComponent(customerIdToUse)}`)
      const orders = Array.isArray(data) ? data : (data.items || [])
      setCustOrders(orders)
      if (orders.length === 0) {
        showToast({ type: 'info', message: 'No se encontraron pedidos para este cliente' })
      } else {
        showToast({ type: 'success', message: `Se encontraron ${orders.length} pedido(s)` })
      }
    } catch (e) {
      console.error('Error obteniendo pedidos:', e)
      setCustOrders([])
      const errorMsg = e.message || 'No se pudo obtener los pedidos'
      showToast({ type:'error', message: errorMsg })
    }
  }

  function renderTrack(t) {
    const wrap = document.getElementById('cust-track-view')
    if (!t) { 
      if (wrap) wrap.innerHTML = '<div style="padding: 1rem; text-align: center; color: #9ca3af;">Sin datos de seguimiento</div>'
      return 
    }
    const points = Array.isArray(t) ? t : (t.points || [])
    const validPoints = points.filter(p => p && typeof p.lat === 'number' && isFinite(p.lat) && typeof p.lng === 'number' && isFinite(p.lng))
    const last = validPoints[validPoints.length - 1] || null
    lastPointRef.current = last

    // Inicializar mapa si no existe
    if (!mapRef.current) {
      mapRef.current = L.map('cust-map').setView(last ? [last.lat, last.lng] : [-12.0464, -77.0428], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19, 
        attribution: '&copy; OpenStreetMap' 
      }).addTo(mapRef.current)
    }
    const map = mapRef.current

    // Obtener coordenadas de origen y destino
    const tenantId = getTenantId()
    const origin = TENANT_ORIGINS[tenantId]
    const destLatRaw = orderDetails && (orderDetails.dest_lat ?? orderDetails.destLat)
    const destLngRaw = orderDetails && (orderDetails.dest_lng ?? orderDetails.destLng)
    const destLat = destLatRaw != null ? Number(destLatRaw) : null
    const destLng = destLngRaw != null ? Number(destLngRaw) : null

    // Marcador de origen (restaurante)
    if (origin) {
      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([origin.lat, origin.lng])
      } else {
        originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon: originIcon })
          .bindPopup('<strong>🍽️ Restaurante</strong><br/>Punto de origen')
          .addTo(map)
      }
    }

    // Marcador de destino (casa del cliente)
    if (isFinite(destLat) && isFinite(destLng)) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng([destLat, destLng])
      } else {
        destinationMarkerRef.current = L.marker([destLat, destLng], { icon: destinationIcon })
          .bindPopup('<strong>🏠 Tu ubicación</strong><br/>Destino de entrega')
          .addTo(map)
      }
    }

    // Línea de ruta planificada (origen -> destino)
    if (origin && isFinite(destLat) && isFinite(destLng)) {
      const routeLatLngs = [
        [origin.lat, origin.lng],
        [destLat, destLng],
      ]
      if (routeRef.current) {
        routeRef.current.setLatLngs(routeLatLngs)
      } else {
        routeRef.current = L.polyline(routeLatLngs, { 
          color: '#94a3b8', 
          dashArray: '8 6',
          weight: 3,
          opacity: 0.6
        }).addTo(map)
      }
    }

    // Ruta recorrida por el delivery (tracking real)
    const latlngs = validPoints.map(p => [p.lat, p.lng])
    if (polyRef.current) {
      if (latlngs.length) {
        polyRef.current.setLatLngs(latlngs)
      } else {
        map.removeLayer(polyRef.current)
        polyRef.current = null
      }
    } else if (latlngs.length) {
      polyRef.current = L.polyline(latlngs, { 
        color: '#16a34a',
        weight: 4,
        opacity: 0.8
      }).addTo(map)
    }

    // Marcador del delivery (posición actual del repartidor) con animación suave
    if (markerRef.current) {
      if (last && typeof last.lat === 'number' && typeof last.lng === 'number') {
        // Animación suave del marcador
        const currentLatLng = markerRef.current.getLatLng()
        const newLatLng = L.latLng(last.lat, last.lng)
        
        // Si la distancia es pequeña, animar suavemente
        const distance = currentLatLng.distanceTo(newLatLng)
        if (distance < 1000 && useMockRoute) { // Solo animar en modo mock y distancias cortas
          // Animación con pasos intermedios
          let step = 0
          const steps = 20
          const latStep = (newLatLng.lat - currentLatLng.lat) / steps
          const lngStep = (newLatLng.lng - currentLatLng.lng) / steps
          
          const animate = () => {
            if (step < steps && markerRef.current) {
              step++
              const intermediateLat = currentLatLng.lat + latStep * step
              const intermediateLng = currentLatLng.lng + lngStep * step
              markerRef.current.setLatLng([intermediateLat, intermediateLng])
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        } else {
          markerRef.current.setLatLng([last.lat, last.lng])
        }
      } else {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
    } else if (last && typeof last.lat === 'number' && typeof last.lng === 'number') {
      markerRef.current = L.marker([last.lat, last.lng], { icon: deliveryIcon })
        .bindPopup('<strong>🛵 Repartidor</strong><br/>Posición actual')
        .addTo(map)
    }

    // Ajustar vista del mapa
    const allPoints = []
    if (origin) allPoints.push([origin.lat, origin.lng])
    if (isFinite(destLat) && isFinite(destLng)) allPoints.push([destLat, destLng])
    if (latlngs.length) allPoints.push(...latlngs)
    
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }

    // Actualizar info de tracking
    if (wrap) {
      const distanceText = last && isFinite(destLat) && isFinite(destLng) 
        ? `${(haversine(last, { lat: destLat, lng: destLng }) / 1000).toFixed(2)} km`
        : '—'
      
      // Calcular progreso si está en modo mock
      let progressPercent = 0
      let etaMinutes = '—'
      if (useMockRoute && mockRoutePointsRef.current.length > 0) {
        progressPercent = Math.round((mockCurrentIndexRef.current / (mockRoutePointsRef.current.length - 1)) * 100)
        const remainingPoints = mockRoutePointsRef.current.length - mockCurrentIndexRef.current
        etaMinutes = Math.ceil((remainingPoints * 2) / 60) // 2 segundos por punto
      }
      
      wrap.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 1rem; border-radius: 0.75rem; border: 1px solid #bbf7d0; position: relative; overflow: hidden;">
            ${useMockRoute ? `<div style="position: absolute; bottom: 0; left: 0; height: 4px; background: #16a34a; width: ${progressPercent}%; transition: width 0.5s ease;"></div>` : ''}
            <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 0.25rem;">POSICIÓN DEL REPARTIDOR</div>
            <div style="font-size: 20px; font-weight: 700; color: #16a34a;">
              ${last ? '🛵 En movimiento' : '⏳ Esperando...'}
            </div>
            <div style="font-size: 11px; color: #15803d; margin-top: 0.25rem;">
              ${last ? `Última actualización: ${new Date().toLocaleTimeString()}` : 'Sin señal GPS aún'}
            </div>
          </div>
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 1rem; border-radius: 0.75rem; border: 1px solid #fecaca;">
            <div style="font-size: 12px; color: #991b1b; font-weight: 600; margin-bottom: 0.25rem;">DISTANCIA RESTANTE</div>
            <div style="font-size: 20px; font-weight: 700; color: #dc2626;">
              ${distanceText}
            </div>
            <div style="font-size: 11px; color: #b91c1c; margin-top: 0.25rem;">
              Hasta tu ubicación
            </div>
          </div>
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 1rem; border-radius: 0.75rem; border: 1px solid #bfdbfe;">
            <div style="font-size: 12px; color: #1e40af; font-weight: 600; margin-bottom: 0.25rem;">${useMockRoute ? 'PROGRESO' : 'PUNTOS DE TRACKING'}</div>
            <div style="font-size: 20px; font-weight: 700; color: #2563eb;">
              ${useMockRoute ? `${progressPercent}%` : validPoints.length}
            </div>
            <div style="font-size: 11px; color: #1d4ed8; margin-top: 0.25rem;">
              ${useMockRoute ? `ETA: ~${etaMinutes} min` : 'Actualizaciones GPS recibidas'}
            </div>
          </div>
        </div>
      `
    }
  }

  function calcEta() {
    const last = lastPointRef.current
    const dlat = parseFloat(document.getElementById('cust-eta-lat')?.value)
    const dlng = parseFloat(document.getElementById('cust-eta-lng')?.value)
    const kmh = parseFloat(document.getElementById('cust-eta-speed')?.value) || 25
    const etaEl = document.getElementById('cust-eta-view')
    if (!last || !isFinite(dlat) || !isFinite(dlng)) { if (etaEl) etaEl.textContent = 'ETA ~ —'; return }
    const meters = haversine({ lat: last.lat, lng: last.lng }, { lat: dlat, lng: dlng })
    const mps = Math.max(kmh, 1) * 1000 / 3600
    const seconds = meters / mps
    if (etaEl) etaEl.textContent = `ETA ~ ${formatDuration(seconds)} (distancia ${(meters/1000).toFixed(2)} km)`
  }

  // Efecto para iniciar automáticamente la simulación si no hay tracking real
  useEffect(() => {
    if (!orderDetails || useMockRoute) return
    
    // Esperar un momento para intentar obtener tracking real
    const checkTimer = setTimeout(async () => {
      if (deliveryId) {
        try {
          const data = await api(`/delivery/${encodeURIComponent(deliveryId)}/track`)
          const hasRealTracking = data && (
            (Array.isArray(data) && data.length > 0) ||
            (data.points && data.points.length > 0) ||
            (data.lat !== undefined && data.lon !== undefined)
          )
          
          // Si no hay tracking real, iniciar simulación automáticamente
          if (!hasRealTracking) {
            console.log('No hay tracking real, iniciando simulación automática...')
            startMockAnimation()
          }
        } catch (e) {
          // Si hay error obteniendo tracking, iniciar simulación
          console.log('Error obteniendo tracking, iniciando simulación automática...')
          startMockAnimation()
        }
      } else {
        // Si no hay deliveryId pero hay orderDetails, iniciar simulación
        const destLatRaw = orderDetails.dest_lat ?? orderDetails.destLat
        const destLngRaw = orderDetails.dest_lng ?? orderDetails.destLng
        if (destLatRaw != null && destLngRaw != null) {
          console.log('Iniciando simulación automática con destino del pedido...')
          startMockAnimation()
        }
      }
    }, 2000) // Esperar 2 segundos antes de verificar
    
    return () => clearTimeout(checkTimer)
  }, [orderDetails])

  useEffect(() => {
    if (!deliveryId || useMockRoute) return
    const t = setInterval(() => fetchTrack(deliveryId), 10000)
    fetchTrack(deliveryId)
    return () => {
      clearInterval(t)
      // Limpiar animación mock al desmontar
      if (mockAnimationRef.current) {
        clearInterval(mockAnimationRef.current)
      }
    }
  }, [deliveryId, useMockRoute])

  const steps = ['recibido', 'en_preparacion', 'listo_para_entrega', 'en_camino', 'entregado']
  const rawStatus = String(order?.status || order?.estado || '').toLowerCase()
  let derivedStatus = rawStatus
  if (orderDetails && Array.isArray(orderDetails.history) && orderDetails.history.length > 0) {
    const hasAccepted = orderDetails.history.some(h => {
      const stepName = String((h && h.step) || '').toLowerCase()
      return stepName.includes('aceptado') || stepName.includes('accepted')
    })

    // Solo escalar de "recibido" (o vacío) a "en_preparacion" si el historial lo indica,
    // nunca bajar estados más avanzados como "listo_para_entrega", "en_camino" o "entregado".
    const isRawEmptyOrReceived = !rawStatus || rawStatus === 'recibido'
    if (hasAccepted && isRawEmptyOrReceived) {
      derivedStatus = 'en_preparacion'
    }
  }
  const currentStatus = derivedStatus
  const currentStepIndex = steps.findIndex(s => currentStatus.includes(s.replace('_', '')) || currentStatus === s)

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem 1rem 2.25rem' }}>
      <section className="container" style={{ maxWidth: 840, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 className="appTitle" style={{ color:'#03592e', fontSize: '32px', marginBottom: '.25rem' }}>Seguimiento de pedido</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Ingresa el ID de tu pedido para ver en qué etapa va y revisar el historial completo.
          </p>
        </header>

        {/* Buscador de pedido */}
        <form
          onSubmit={onSubmit}
          className="card"
          style={{ maxWidth: 640, margin: '0 auto 2rem', padding: '1.25rem 1.5rem', boxShadow: '0 12px 30px rgba(15,23,42,0.08)', borderRadius: '1rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.75rem'
            }}
          >
            <input
              className="input"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="ID de pedido (por ejemplo, copiado desde tus pedidos activos)"
              required
              style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}
            />
            <button
              className="btn primary"
              type="submit"
              style={{ height: '2.75rem', whiteSpace: 'nowrap' }}
            >
              Consultar
            </button>
          </div>
          {err && (
            <div style={{ marginTop: '.75rem', fontSize: '13px', color: '#b91c1c' }}>{err}</div>
          )}
        </form>

        {/* Estado actual del pedido */}
        {order && (
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="card" style={{ 
              padding: '2rem', 
              borderRadius: '1.25rem', 
              boxShadow: '0 20px 40px rgba(15,23,42,0.1)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
              border: '1px solid #e5e7eb',
              marginBottom: '1.5rem' 
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '.35rem' }}>PEDIDO</div>
                  <div style={{ 
                    fontWeight: 800, 
                    color: '#03592e', 
                    fontSize: '28px',
                    letterSpacing: '-0.02em'
                  }}>
                    #{order.id_order || order.order_id || order.id}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '.35rem' }}>MONTO TOTAL</div>
                  {Number(order.total || 0) === 0 ? (
                    <div style={{ 
                      fontWeight: 800, 
                      color: '#16a34a',
                      fontSize: '28px',
                      letterSpacing: '-0.02em'
                    }}>
                      ✓ Pagado
                    </div>
                  ) : (
                    <div style={{ 
                      fontWeight: 800, 
                      color: '#03592e',
                      fontSize: '28px',
                      letterSpacing: '-0.02em'
                    }}>
                      {formatPrice(order.total || 0)}
                    </div>
                  )}
                  <div style={{ marginTop: '.75rem' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '.4rem .9rem',
                      borderRadius: '999px',
                      border: '2px solid #16a34a',
                      color: '#166534',
                      background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                      textTransform: 'capitalize',
                      fontWeight: 700,
                      display: 'inline-block',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
                    }}>
                      {(currentStatus || rawStatus || 'desconocido').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso visual mejorada */}
              <div style={{ 
                margin: '1.5rem 0 2rem',
                padding: '1.5rem',
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: '1rem', position: 'relative' }}>
                  {/* Línea de conexión entre pasos */}
                  <div style={{
                    position: 'absolute',
                    top: '18px',
                    left: '10%',
                    right: '10%',
                    height: '4px',
                    background: '#e5e7eb',
                    borderRadius: '999px',
                    zIndex: 0
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                      borderRadius: '999px',
                      width: currentStepIndex === -1 ? '0%' : `${(currentStepIndex / (steps.length - 1)) * 100}%`,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  
                  {steps.map((step, idx) => {
                    const isDone = currentStepIndex >= idx && currentStepIndex !== -1
                    const isCurrent = currentStepIndex === idx
                    const label = step.replace(/_/g, ' ')
                    const emojis = ['📝', '👨‍🍳', '📦', '🛵', '✅']
                    
                    return (
                      <div key={step} style={{ 
                        flex: 1, 
                        textAlign:'center', 
                        fontSize: '11px', 
                        color: isDone ? '#065f46' : '#9ca3af',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div
                          style={{
                            width: isCurrent ? 44 : 36,
                            height: isCurrent ? 44 : 36,
                            borderRadius: '999px',
                            margin: '0 auto .5rem',
                            border: `3px solid ${isDone ? '#16a34a' : '#d1d5db'}`,
                            background: isDone 
                              ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' 
                              : 'white',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize: isCurrent ? '18px' : '16px',
                            fontWeight: 700,
                            boxShadow: isDone ? '0 4px 12px rgba(22, 163, 74, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease',
                            transform: isCurrent ? 'scale(1.1)' : 'scale(1)'
                          }}
                        >
                          {isDone ? '✓' : emojis[idx]}
                        </div>
                        <div style={{ 
                          textTransform:'capitalize',
                          fontWeight: isCurrent ? 700 : 600,
                          fontSize: isCurrent ? '12px' : '11px',
                          lineHeight: '1.3'
                        }}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resumen de productos y acciones */}
              <div style={{ display:'flex', justifyContent:'space-between', gap: '1rem', alignItems:'flex-start', flexWrap:'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: '13px', color:'#6b7280', marginBottom: '.25rem' }}>Detalle del pedido</div>
                  {(() => {
                    const items = (orderDetails && Array.isArray(orderDetails.items) && orderDetails.items.length)
                      ? orderDetails.items
                      : (order.items || [])
                    if (!items.length) {
                      return <div style={{ fontSize: '13px', color:'#9ca3af' }}>Sin detalle disponible para este pedido.</div>
                    }
                    return (
                      <ul className="list" style={{ paddingLeft:'1rem' }}>
                        {items.map((i, idx) => (
                          <li key={idx}>
                            {i.cantidad || i.qty || 1} × {i.nombre || i.name}
                            {typeof i.precio === 'number' && (
                              <span style={{ marginLeft: '.35rem', color:'#6b7280' }}>
                                ({formatPrice(i.precio)})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                </div>
                <div style={{ width: 220, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                  <button
                    className="btn danger"
                    style={{ width: '100%' }}
                    disabled={!canCancelStatus(order.status || order.estado)}
                    onClick={(e)=>{
                      e.preventDefault()
                      if (!canCancelStatus(order.status || order.estado)) {
                        showToast({ type:'warning', message:'Solo puedes cancelar si el estado es "recibido"' })
                        return
                      }
                      cancelOrder()
                    }}
                  >
                    Cancelar pedido
                  </button>
                  {!canCancelStatus(order.status || order.estado) && (
                    <div style={{ color:'#6b7280', fontSize:'12px' }}>
                      Solo se puede cancelar cuando el estado es <strong>recibido</strong>.
                    </div>
                  )}

                  {(() => {
                    const st = String(currentStatus || rawStatus).toLowerCase()
                    return st.includes('entregado') || st.includes('delivered')
                  })() && (
                    <button
                      className="btn"
                      style={{ width: '100%', marginTop: '.35rem' }}
                      onClick={async e => {
                        e.preventDefault()
                        const oid = order.id_order || order.order_id || id
                        if (!oid) return
                        try {
                          await api(`/orders/${encodeURIComponent(oid)}/customer-confirm-delivered`, { method: 'POST' })
                          showToast({ type: 'success', message: '¡Gracias! Confirmaste que tu pedido llegó.' })
                        } catch (err) {
                          console.error('Error confirmando entrega por cliente:', err)
                          showToast({ type: 'error', message: err.message || 'No se pudo registrar tu confirmación' })
                        }
                      }}
                    >
                      ✅ Confirmar que ya llegó
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="section" style={{ marginTop: '1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
            gap: '1.25rem',
            alignItems: 'stretch'
          }}
        >
          <div className="card" style={{ 
            borderRadius: '1rem', 
            height: '100%', 
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
          }}>
            <h2 className="appTitle" style={{ 
              marginBottom: '1rem', 
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem'
            }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              Historial del pedido
            </h2>
            {!orderDetails ? (
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>—</div>
            ) : (
              <div>
                {(orderDetails.history || []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>Sin eventos aún</div>
                ) : (
                  <ul className="list" style={{ margin: 0 }}>
                    {(orderDetails.history || []).map((h, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.1fr) minmax(0,1fr)',
                          alignItems: 'center',
                          fontSize: '13px',
                          padding: '.45rem .75rem',
                          borderRadius: '999px',
                          background: idx % 2 === 0 ? '#f9fafb' : '#f3f4f6',
                          marginBottom: '.35rem'
                        }}
                      >
                        <div style={{ textTransform: 'capitalize', fontWeight: 600 }}>{String(h.step || 'evento')}</div>
                        <div style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.by || '—'}</div>
                        <div style={{ color: '#6b7280', textAlign: 'right' }}>{h.at ? new Date(h.at).toLocaleString() : '—'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ 
            borderRadius: '1rem', 
            height: '100%', 
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
          }}>
            <h2 className="appTitle" style={{ 
              marginBottom: '1rem', 
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem'
            }}>
              <span style={{ fontSize: '20px' }}>🚚</span>
              Detalle del delivery
            </h2>
            {!orderDetails ? (
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>—</div>
            ) : (
              (() => {
                const delivery = (orderDetails.workflow || {}).delivery || {}
                const dStatus = delivery.status || '—'
                const createdRaw = orderDetails.created_at
                // Momento en que el local asigna el delivery al repartidor (salida a reparto lógica)
                const startRaw = delivery.assigned_at || delivery.tiempo_salida || delivery.start_time
                const endRaw = delivery.tiempo_llegada || delivery.end_time
                const customerConfirmedRaw = orderDetails.customer_confirmed_at

                // ETA y distancia calculados dinámicamente con la misma lógica base que calcEta
                const last = lastPointRef.current
                const destLatRaw = orderDetails.dest_lat ?? orderDetails.destLat
                const destLngRaw = orderDetails.dest_lng ?? orderDetails.destLng
                let etaSeconds = null
                let distanceKm = null
                if (destLatRaw != null && destLngRaw != null) {
                  const destLat = Number(destLatRaw)
                  const destLng = Number(destLngRaw)
                  if (isFinite(destLat) && isFinite(destLng)) {
                    // Punto de partida para el ETA: último tracking si existe, sino sucursal
                    let fromLat = null
                    let fromLng = null
                    if (last && typeof last.lat === 'number' && typeof last.lng === 'number') {
                      fromLat = last.lat
                      fromLng = last.lng
                    } else {
                      const tenantId = getTenantId()
                      const origin = TENANT_ORIGINS[tenantId]
                      if (origin) {
                        fromLat = origin.lat
                        fromLng = origin.lng
                      }
                    }

                    if (isFinite(fromLat) && isFinite(fromLng)) {
                      const meters = haversine(
                        { lat: fromLat, lng: fromLng },
                        { lat: destLat, lng: destLng }
                      )
                      distanceKm = meters / 1000
                      const kmh = 25 // velocidad promedio configurada
                      const mps = Math.max(kmh, 1) * 1000 / 3600
                      etaSeconds = meters / mps
                    }
                  }
                }

                const etaRaw = delivery.eta_min || delivery.eta
                const dCreated = createdRaw ? new Date(createdRaw).toLocaleString() : '—'
                const dStart = startRaw ? new Date(startRaw).toLocaleString() : '—'
                const dEnd = endRaw ? new Date(endRaw).toLocaleString() : '—'
                const dCustomerConfirmed = customerConfirmedRaw ? new Date(customerConfirmedRaw).toLocaleString() : '—'

                let dEta = '—'
                if (etaSeconds != null && isFinite(etaSeconds)) {
                  const base = formatDuration(etaSeconds)
                  let etaClock = ''
                  const baseTimeRaw = startRaw || createdRaw
                  if (baseTimeRaw) {
                    const baseTime = new Date(baseTimeRaw)
                    const etaDate = new Date(baseTime.getTime() + etaSeconds * 1000)
                    etaClock = ` · aprox ${etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  }
                  dEta = distanceKm != null && isFinite(distanceKm)
                    ? `${base} (~${distanceKm.toFixed(2)} km)${etaClock}`
                    : `${base}${etaClock}`
                } else if (typeof etaRaw === 'number') {
                  dEta = `${etaRaw.toFixed(1)} min`
                } else if (etaRaw) {
                  dEta = etaRaw
                }

                const dStaff = delivery.id_delivery || delivery.assigned_to || '—'
                return (
                  <dl style={{ fontSize: '13px', color: '#4b5563', display: 'grid', rowGap: '.35rem', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', paddingBottom: '.2rem', borderBottom: '1px dashed #e5e7eb' }}>
                      <dt style={{ fontWeight: 600 }}>Estado</dt>
                      <dd style={{ margin: 0, textTransform: 'capitalize' }}>{dStatus}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Pedido creado</dt>
                      <dd style={{ margin: 0 }}>{dCreated}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Salida a reparto</dt>
                      <dd style={{ margin: 0 }}>{dStart}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>ETA estimado</dt>
                      <dd style={{ margin: 0 }}>{dEta}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Fin (entrega)</dt>
                      <dd style={{ margin: 0 }}>{dEnd}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Confirmación cliente</dt>
                      <dd style={{ margin: 0 }}>{dCustomerConfirmed}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Reparto / ID</dt>
                      <dd style={{ margin: 0 }}>{dStaff}</dd>
                    </div>
                  </dl>
                )
              })()
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(15,23,42,0.08)' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 className="appTitle" style={{ marginBottom: '.5rem', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ fontSize: '24px' }}>📍</span>
              Seguimiento en tiempo real
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Mira la ubicación actual de tu repartidor y la ruta que está siguiendo hasta tu dirección.
            </p>
          </div>
          
          <div id="cust-track-view" style={{ marginBottom: '1rem' }}></div>
          
          <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div id="cust-map" className="map" style={{ height: '500px', borderRadius: '0.75rem' }}></div>
            
            {/* Leyenda del mapa */}
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '12px',
              zIndex: 1000
            }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1f2937' }}>Leyenda</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '16px' }}>🛵</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Repartidor (posición actual)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '16px' }}>🏠</span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Tu ubicación</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '16px' }}>🍽️</span>
                  <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Restaurante</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.35rem', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ width: '20px', height: '3px', background: '#16a34a', borderRadius: '2px' }}></div>
                  <span style={{ color: '#4b5563' }}>Ruta recorrida</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '2px', background: '#94a3b8', borderRadius: '2px', borderTop: '2px dashed #94a3b8' }}></div>
                  <span style={{ color: '#4b5563' }}>Ruta planificada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  </main>
  )
}