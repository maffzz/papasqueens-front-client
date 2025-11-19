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
        setOrders(all)
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
            const status = o.status || o.estado
            return (
              <div key={id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div><strong>#{id}</strong> — {status}</div>
                  <div className="price">{formatPrice(o.total || 0)}</div>
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
