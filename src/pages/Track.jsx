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

  return (
    <main className="container section" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="appTitle" style={{ color:'#03592e', textAlign: 'center' }}>Seguimiento de pedido</h1>
      <form
        onSubmit={onSubmit}
        className="list card"
        style={{ maxWidth: 600, margin: '1rem auto' }}
      >
        <input className="input" value={id} onChange={e => setId(e.target.value)} placeholder="ID de pedido" required />
        <button className="btn primary" type="submit">Consultar</button>
      </form>
      <section className="section">
        {err && <div className="card">{err}</div>}
        {order && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <strong>Pedido #{order.id_order || order.order_id || order.id}</strong>
              <span className="price">{formatPrice(order.total || 0)}</span>
            </div>
            <div style={{ margin:'.5rem 0' }}>Estado: <strong>{order.status || order.estado || 'desconocido'}</strong></div>
            <ul className="list" style={{ paddingLeft:'1rem' }}>
              {(order.items || []).map((i, idx) => <li key={idx}>{i.cantidad || i.qty || 1} × {i.nombre || i.name}</li>)}
            </ul>
            <div style={{ marginTop: '.5rem' }}>
              <button className="btn danger" disabled={!canCancelStatus(order.status || order.estado)} onClick={(e)=>{ e.preventDefault(); if (!canCancelStatus(order.status || order.estado)) { showToast({ type:'warning', message:'Solo puedes cancelar si el estado es "recibido"' }); return } cancelOrder() }}>Cancelar pedido</button>
              {!canCancelStatus(order.status || order.estado) && (
                <div style={{ marginTop: '.25rem', color:'#666' }}>Solo se puede cancelar cuando el estado es <strong>recibido</strong>.</div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="card">
          <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Historial del pedido</h2>
          {!orderDetails ? (
            <div>—</div>
          ) : (
            <div className="list">
              {(orderDetails.history || []).length === 0 ? (
                <div className="card">Sin eventos aún</div>
              ) : (
                <ul className="list">
                  {(orderDetails.history || []).map((h, idx) => (
                    <li key={idx} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ textTransform:'capitalize' }}>{String(h.step || 'evento')}</div>
                      <div style={{ color:'#666' }}>{h.by || '—'}</div>
                      <div style={{ color:'#666' }}>{h.at ? new Date(h.at).toLocaleString() : '—'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Workflow (detalle)</h2>
          {!orderDetails ? (
            <div>—</div>
          ) : (
            <div className="list">
              <div>
                <strong>Cocina</strong>
                <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify((orderDetails.workflow||{}).kitchen || {}, null, 2)}</pre>
              </div>
              <div>
                <strong>Delivery</strong>
                <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify((orderDetails.workflow||{}).delivery || {}, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Seguimiento del repartidor</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (deliveryId) fetchTrack(deliveryId) }} className="list">
            <input className="input" value={deliveryId} onChange={e => setDeliveryId(e.target.value)} placeholder="ID de delivery (si lo tienes)" />
            <button className="btn" type="submit">Actualizar</button>
          </form>
          <div id="cust-track-view" className="list" style={{ marginTop: '.75rem' }}></div>
          <div id="cust-map" className="map"></div>
          <div className="list" style={{ marginTop: '.75rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem' }}>
              <input id="cust-eta-lat" className="input" placeholder="Destino lat" onInput={calcEta} />
              <input id="cust-eta-lng" className="input" placeholder="Destino lng" onInput={calcEta} />
            </div>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
              <input id="cust-eta-speed" className="input" defaultValue="25" placeholder="Velocidad km/h (default 25)" onInput={calcEta} />
              <button className="btn" onClick={(e)=>{ e.preventDefault(); calcEta() }}>Recalcular</button>
            </div>
            <div id="cust-eta-view" style={{ color:'#666' }}>ETA ~ —</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Mis pedidos (por ID de cliente)</h2>
          <form onSubmit={fetchCustomerOrders} className="list">
            <input className="input" value={custId} onChange={e=>setCustId(e.target.value)} placeholder="ID cliente / teléfono" />
            <button className="btn" type="submit">Buscar</button>
          </form>
          <div className="list" style={{ marginTop: '.5rem' }}>
            {custOrders.length === 0 ? <div className="card">Sin resultados</div> : (
              <div className="list">
                {custOrders.map(o => (
                  <div key={o.id_order || o.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div><strong>#{o.id_order || o.id}</strong> — {o.status || o.estado}</div>
                      <div className="price">{formatPrice(o.total || 0)}</div>
                    </div>
                    <button className="btn" onClick={()=>{ setId(String(o.id_order || o.id)); fetchOrder(String(o.id_order || o.id)) }}>Ver</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
