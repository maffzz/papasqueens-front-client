import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatPrice } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ActiveOrders() {
  const { auth } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const { add, clear } = useCart()

  useEffect(() => {
    async function load() {
      if (!auth?.id) {
        setLoading(false)
        return
      }
      try {
        setErr('')
        const data = await api(`/orders/customer/${encodeURIComponent(auth.id)}`)
        const all = Array.isArray(data) ? data : (data.items || [])

        // Para mostrar estados coherentes con la página de tracking,
        // enriquecemos cada pedido consultando sus detalles completos
        const enriched = await Promise.all(
          all.map(async base => {
            const id = base.id_order || base.id
            if (!id) return base
            try {
              const det = await api(`/orders/${encodeURIComponent(id)}`)
              const orderDetails = det || {}

              const stepsHistory = Array.isArray(orderDetails.history) ? orderDetails.history : []
              const rawStatus = String(orderDetails.status || orderDetails.estado || base.status || base.estado || '').toLowerCase()
              let derivedStatus = rawStatus

              const delivery = (orderDetails.workflow || {}).delivery || {}
              const deliveryStatusRaw = String(delivery.status || delivery.estado || '').toLowerCase()
              const deliveryStatus = deliveryStatusRaw.replace(/_/g, ' ').trim()

              if (stepsHistory.length > 0) {
                const hasDelivered = stepsHistory.some(h => String(h.step || '').toLowerCase().includes('entregado'))
                const hasOutForDelivery = stepsHistory.some(h => {
                  const s = String(h.step || '').toLowerCase()
                  return s.includes('salida_reparto') || s.includes('en_camino') || s.includes('onroute')
                })
                const hasAssigned = stepsHistory.some(h => String(h.step || '').toLowerCase().includes('asignado'))
                const hasAccepted = stepsHistory.some(h => {
                  const s = String(h.step || '').toLowerCase()
                  return s.includes('aceptado') || s.includes('accepted')
                })

                if (hasDelivered) {
                  derivedStatus = 'entregado'
                } else if (hasOutForDelivery) {
                  derivedStatus = 'en_camino'
                } else if (hasAssigned) {
                  derivedStatus = 'listo_para_entrega'
                } else if (hasAccepted && (!rawStatus || rawStatus === 'recibido')) {
                  // Solo elevamos a en_preparacion si antes estaba en recibido o vacío
                  derivedStatus = 'en_preparacion'
                }
              }

              // Ajustar con el estado de delivery si es más avanzado (sin bajar estados ya entregados)
              if (deliveryStatus) {
                const ds = String(derivedStatus || '').toLowerCase()
                const isDeliveredLike = ds.includes('entregado') || ds.includes('delivered')
                if (!isDeliveredLike) {
                  const dsNorm = deliveryStatus.replace(/\s+/g, ' ')
                  if (
                    dsNorm.includes('en camino') ||
                    dsNorm.includes('encamino') ||
                    dsNorm.includes('onroute') ||
                    dsNorm.includes('on route')
                  ) {
                    derivedStatus = 'en_camino'
                  } else if (dsNorm.includes('listo para entrega') || dsNorm.includes('assigned')) {
                    // Solo subir hasta listo_para_entrega si aún estamos en estados más tempranos
                    if (!ds || ds === 'recibido' || ds === 'en_preparacion') {
                      derivedStatus = 'listo_para_entrega'
                    }
                  }
                }
              }

              const customerConfirmed = !!orderDetails.customer_confirmed_delivered

              // Si el cliente ya confirmó entrega, forzamos el estado a 'entregado'
              // aunque por algún motivo el history aún no tenga el paso explícito.
              if (customerConfirmed) {
                const ds = String(derivedStatus || '').toLowerCase()
                if (!ds.includes('entregado') && !ds.includes('delivered')) {
                  derivedStatus = 'entregado'
                }
              }
              const itemsForRepeat = Array.isArray(orderDetails.items) ? orderDetails.items : []

              return {
                ...base,
                _currentStatus: derivedStatus,
                customer_confirmed_delivered: customerConfirmed,
                _itemsForRepeat: itemsForRepeat,
              }
            } catch (err) {
              console.warn('No se pudo enriquecer pedido', id, err)
              return base
            }
          })
        )

        setOrders(enriched)
      } catch (e) {
        console.error('Error obteniendo pedidos activos:', e)
        const msg = e.message || 'No se pudieron obtener tus pedidos'
        setErr(msg)
        showToast({ type: 'error', message: msg })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auth])

  // Helper para determinar si un pedido ya está entregado
  function isDeliveredStatus(st) {
    if (!st) return false
    const s = String(st).toLowerCase()
    return s.includes('entregado') || s.includes('delivered')
  }

  const activeOrders = orders.filter(o => {
    const st = o._currentStatus || o.status || o.estado
    const delivered = isDeliveredStatus(st)
    const confirmed = !!o.customer_confirmed_delivered
    // Activos: no entregados aún, o entregados pero el cliente todavía no confirmó
    return !delivered || !confirmed
  })

  const pastOrders = orders.filter(o => {
    const st = o._currentStatus || o.status || o.estado
    const delivered = isDeliveredStatus(st)
    const confirmed = !!o.customer_confirmed_delivered
    // Anteriores: entregados y confirmados por el cliente
    return delivered && confirmed
  })

  return (
    <main className="container section" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="appTitle" style={{ color: '#03592e', marginBottom: '1rem' }}>Mis pedidos</h1>
      {!auth?.id && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          Debes iniciar sesión para ver tus pedidos.
        </div>
      )}
      {loading ? (
        <div className="card">Cargando…</div>
      ) : err ? (
        <div className="card">{err}</div>
      ) : orders.length === 0 ? (
        <div className="card">No tienes pedidos activos en este momento.</div>
      ) : (
        <>
          <h2 className="appTitle" style={{ fontSize: '18px', marginBottom: '.5rem' }}>Pedidos activos</h2>
          <div className="list" style={{ marginBottom: '1.25rem' }}>
            {activeOrders.length === 0 ? (
              <div className="card">No tienes pedidos activos en este momento.</div>
            ) : (
              activeOrders.map(o => {
                const id = o.id_order || o.id
                const total = Number(o.total || 0)

                // Usar directamente el estado derivado que ya calculamos al enriquecer (incluye kitchen + delivery + confirmaciones)
                const rawStatus = String(o._currentStatus || o.status || o.estado || '').toLowerCase()
                const statusLabel = (rawStatus || 'recibido').replace(/_/g, ' ')
                const isCancelled = statusLabel.toLowerCase().includes('cancelado')

                return (
                  <div key={id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div>
                        <strong>#{id}</strong>
                        {' — '}
                        <span style={{ color: isCancelled ? '#b91c1c' : '#111827' }}>{statusLabel}</span>
                      </div>
                      {total === 0 ? (
                        <div style={{ fontWeight: '600', color: '#16a34a' }}>Pagado</div>
                      ) : (
                        <div className="price">{formatPrice(total)}</div>
                      )}
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => nav(`/track?id=${encodeURIComponent(id)}`)}
                    >
                      Ver seguimiento
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {pastOrders.length > 0 && (
            <section>
              <h2 className="appTitle" style={{ fontSize: '18px', marginBottom: '.5rem' }}>Pedidos anteriores</h2>
              <div className="list">
                {pastOrders.map(o => {
                  const id = o.id_order || o.id
                  const total = Number(o.total || 0)
                  const st = o._currentStatus || o.status || o.estado
                  const statusLabel = (st || 'entregado').replace(/_/g, ' ')
                  const items = Array.isArray(o._itemsForRepeat) ? o._itemsForRepeat : []

                  return (
                    <div
                      key={id}
                      className="card"
                      style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', opacity: 0.95 }}
                    >
                      <div style={{ flex: 1 }}>
                        <div>
                          <strong>#{id}</strong>
                          {' — '}
                          <span style={{ color: '#166534' }}>{statusLabel}</span>
                        </div>
                        {total === 0 ? (
                          <div style={{ fontWeight: '600', color: '#16a34a' }}>Pagado</div>
                        ) : (
                          <div className="price">{formatPrice(total)}</div>
                        )}
                        {items.length > 0 && (
                          <ul className="list" style={{ marginTop: '.35rem', fontSize: '13px' }}>
                            {items.map((it, idx) => (
                              <li key={idx}>
                                {(it.cantidad || it.qty || 1)} × {(it.nombre || it.name || 'Producto')}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right', minWidth: 160 }}>
                        <div style={{ marginBottom: '.35rem' }}>Entrega confirmada</div>
                        {items.length > 0 && (
                          <button
                            className="btn primary"
                            style={{ width: '100%' }}
                            onClick={() => {
                              clear()
                              items.forEach(it => {
                                const idProd = it.id_producto || it.id || it.sku
                                if (!idProd) return
                                const times = it.cantidad || it.qty || 1
                                const baseProduct = {
                                  id_producto: idProd,
                                  nombre: it.nombre || it.name || 'Producto',
                                  precio: it.precio || it.price || 0,
                                }
                                for (let k = 0; k < times; k++) {
                                  add(baseProduct)
                                }
                              })
                              showToast({ type: 'success', message: 'Hemos vuelto a agregar este pedido a tu carrito.' })
                              nav('/menu')
                            }}
                          >
                            Volver a pedir
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
