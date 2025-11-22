import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatPrice, haversine, formatDuration } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import L from 'leaflet'

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
  const lastPointRef = useRef(null)
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

  async function fetchTrack(idDel) {
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
    if (!t) { wrap.innerHTML = '<div className="card">Sin datos</div>'; return }
    const points = Array.isArray(t) ? t : (t.points || [])
    const last = points[points.length - 1]
    lastPointRef.current = last || null
    wrap.innerHTML = `<div class="card"><div><strong>Ruta del repartidor</strong> (${points.length} puntos)</div></div>`

    if (!mapRef.current) {
      mapRef.current = L.map('cust-map').setView(last ? [last.lat, last.lng] : [-12.0464, -77.0428], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapRef.current)
    }
    const map = mapRef.current
    const latlngs = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number').map(p => [p.lat, p.lng])
    if (polyRef.current) { map.removeLayer(polyRef.current); polyRef.current = null }
    if (latlngs.length) {
      polyRef.current = L.polyline(latlngs, { color: '#03592e' }).addTo(map)
      map.fitBounds(polyRef.current.getBounds(), { padding: [20, 20] })
    }
    if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null }
    if (last && typeof last.lat === 'number' && typeof last.lng === 'number') {
      markerRef.current = L.marker([last.lat, last.lng]).addTo(map)
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

  useEffect(() => {
    if (!deliveryId) return
    const t = setInterval(() => fetchTrack(deliveryId), 10000)
    fetchTrack(deliveryId)
    return () => clearInterval(t)
  }, [deliveryId])

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
            <div className="card" style={{ padding: '1.5rem 1.75rem', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(15,23,42,0.06)', marginBottom: '1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>Pedido</div>
                  <div style={{ fontWeight: 700, color: '#03592e' }}>#{order.id_order || order.order_id || order.id}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>Monto</div>
                  {Number(order.total || 0) === 0 ? (
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>Pagado</div>
                  ) : (
                    <div style={{ fontWeight: 700, color: '#03592e' }}>{formatPrice(order.total || 0)}</div>
                  )}
                  <div style={{ marginTop: '.35rem' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '.15rem .55rem',
                      borderRadius: '999px',
                      border: '1px solid #16a34a',
                      color: '#166534',
                      background: '#dcfce7',
                      textTransform: 'capitalize'
                    }}>
                      {(currentStatus || rawStatus || 'desconocido').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso visual */}
              <div style={{ margin: '1rem 0 1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: '.35rem' }}>
                  {steps.map((step, idx) => {
                    const isDone = currentStepIndex >= idx && currentStepIndex !== -1
                    const label = step.replace(/_/g, ' ')
                    return (
                      <div key={step} style={{ flex: 1, textAlign:'center', fontSize: '11px', color: isDone ? '#065f46' : '#9ca3af' }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '999px',
                            margin: '0 auto .25rem',
                            border: '2px solid ' + (isDone ? '#16a34a' : '#d1d5db'),
                            background: isDone ? '#16a34a' : '#f9fafb',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {idx + 1}
                        </div>
                        <span style={{ textTransform:'capitalize' }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ position:'relative', height: 3, background:'#e5e7eb', borderRadius: 999 }}>
                  <div
                    style={{
                      position:'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      borderRadius: 999,
                      background:'#16a34a',
                      width: currentStepIndex === -1 ? '0%' : `${(currentStepIndex / (steps.length - 1)) * 100}%`
                    }}
                  />
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
          <div className="card" style={{ borderRadius: '1rem', height: '100%', padding: '1.25rem 1.5rem' }}>
            <h2 className="appTitle" style={{ marginBottom: '.75rem', fontSize: '17px' }}>Historial del pedido</h2>
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

          <div className="card" style={{ borderRadius: '1rem', height: '100%', padding: '1.25rem 1.5rem' }}>
            <h2 className="appTitle" style={{ marginBottom: '.75rem', fontSize: '17px' }}>Detalle del delivery</h2>
            {!orderDetails ? (
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>—</div>
            ) : (
              (() => {
                const delivery = (orderDetails.workflow || {}).delivery || {}
                const dStatus = delivery.status || '—'
                const dStart = delivery.start_time ? new Date(delivery.start_time).toLocaleString() : '—'
                const dEnd = delivery.end_time ? new Date(delivery.end_time).toLocaleString() : '—'
                const dStaff = delivery.id_delivery || delivery.assigned_to || '—'
                return (
                  <dl style={{ fontSize: '13px', color: '#4b5563', display: 'grid', rowGap: '.35rem', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', paddingBottom: '.2rem', borderBottom: '1px dashed #e5e7eb' }}>
                      <dt style={{ fontWeight: 600 }}>Estado</dt>
                      <dd style={{ margin: 0, textTransform: 'capitalize' }}>{dStatus}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Inicio</dt>
                      <dd style={{ margin: 0 }}>{dStart}</dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                      <dt style={{ fontWeight: 600 }}>Fin</dt>
                      <dd style={{ margin: 0 }}>{dEnd}</dd>
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
        <div className="card">
          <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Seguimiento del repartidor</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '.75rem' }}>
            Cuando tu pedido esté en camino verás aquí la ruta aproximada del repartidor.
          </p>
          <div id="cust-track-view" className="list" style={{ marginBottom: '.75rem' }}></div>
          <div id="cust-map" className="map"></div>
        </div>
      </section>
  </main>
  )
}