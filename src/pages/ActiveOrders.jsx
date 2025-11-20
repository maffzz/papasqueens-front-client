import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatPrice } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function ActiveOrders() {
  const { auth } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const nav = useNavigate()

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

              if (stepsHistory.length > 0) {
                const hasAccepted = stepsHistory.some(h => {
                  const stepName = String((h && h.step) || '').toLowerCase()
                  return stepName.includes('aceptado') || stepName.includes('accepted')
                })
                const hasMultipleSteps = stepsHistory.length > 1
                if (hasAccepted || (hasMultipleSteps && rawStatus === 'recibido')) {
                  derivedStatus = 'en_preparacion'
                }
              }

              return { ...base, _currentStatus: derivedStatus }
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

  return (
    <main className="container section" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="appTitle" style={{ color: '#03592e', marginBottom: '1rem' }}>Mis pedidos activos</h1>
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
        <div className="list">
          {orders.map(o => {
            const id = o.id_order || o.id
            const total = Number(o.total || 0)

            // Estado base
            let rawStatus = String(o._currentStatus || o.status || o.estado || '').toLowerCase()

            // Derivación similar a Track.jsx usando history
            if (Array.isArray(o.history) && o.history.length > 0) {
              const hasAccepted = o.history.some(h => {
                const stepName = String((h && h.step) || '').toLowerCase()
                return stepName.includes('aceptado') || stepName.includes('accepted')
              })
              const hasMultipleSteps = o.history.length > 1
              if (hasAccepted || (hasMultipleSteps && rawStatus === 'recibido')) {
                rawStatus = 'en_preparacion'
              }
            }

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
          })}
        </div>
      )}
    </main>
  )
}
