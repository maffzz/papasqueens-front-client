import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
