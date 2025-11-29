import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function Track() {
  const [sp] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [id, setId] = useState(sp.get('id') || '')
  const [err, setErr] = useState('')
  const [orderDetails, setOrderDetails] = useState(null)
  const [custId, setCustId] = useState('')
  const [custOrders, setCustOrders] = useState([])
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
                const startRaw = delivery.assigned_at || delivery.tiempo_salida || delivery.start_time
                const endRaw = delivery.tiempo_llegada || delivery.end_time
                const customerConfirmedRaw = orderDetails.customer_confirmed_at

                const dCreated = createdRaw ? new Date(createdRaw).toLocaleString() : '—'
                const dStart = startRaw ? new Date(startRaw).toLocaleString() : '—'
                const dEnd = endRaw ? new Date(endRaw).toLocaleString() : '—'
                const dCustomerConfirmed = customerConfirmedRaw ? new Date(customerConfirmedRaw).toLocaleString() : '—'

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
  </main>
  )
}