import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getTenantId } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const [msg, setMsg] = useState('')
  const nav = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  async function onSubmit(ev) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const tenant_id = getTenantId()
    if (!tenant_id) {
      setMsg('Error: No se encontró tenant_id. Por favor recarga la página.')
      showToast({ type: 'error', message: 'Error: tenant_id requerido' })
      return
    }
    const payload = { 
      email: fd.get('email'), 
      password: fd.get('password'), 
      name: fd.get('name'),
      tenant_id: tenant_id  // Backend requiere tenant_id en el body
    }
    if (!payload.email || !payload.password) { 
      setMsg('Completa email y contraseña')
      showToast({ type:'warning', message:'Completa email y contraseña' })
      return 
    }
    try {
      console.log('Intentando login con tenant_id:', tenant_id)
      const res = await api('/auth/customer/login', { method: 'POST', body: JSON.stringify(payload) })
      console.log('Respuesta del login:', res)
      const token = res.token || res.access_token || 'customer'
      const headersReq = res.headers_required || {}
      const userData = {
        token,
        role: 'cliente',
        user: res.name || payload.name || payload.email,
        id: res.id_user || res.id || headersReq['X-User-Id'] || payload.email,
        email: res.email || payload.email,
        type: 'customer',
        tenant_id: res.tenant_id || tenant_id  // Guardar tenant_id en auth
      }
      login(userData)
      setMsg('Ingreso correcto')
      showToast({ type:'success', message:'Ingreso correcto' })
      setTimeout(() => nav('/'), 500)
    } catch (e) {
      console.error('Error en login:', e)
      const errorMsg = e.message || 'Credenciales inválidas'
      setMsg(errorMsg)
      showToast({ type:'error', message: errorMsg })
    }
  }

  return (
    <main style={{ height: 'calc(100vh - 80px)', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem 1rem 0', overflow: 'hidden' }}>
      <section className="container" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem 2.25rem', boxShadow: '0 18px 45px rgba(15,23,42,0.18)', borderRadius: '1.25rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 className="appTitle" style={{ color: '#03592e', fontSize: '28px', marginBottom: '.25rem' }}>Acceso clientes</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Ingresa con tu cuenta para ver tu historial de pedidos y hacer nuevos pedidos más rápido.
              </p>
              <div style={{ marginTop: '.75rem', fontSize: '12px', color: '#b45309', background: '#fffbeb', border: '1px solid #facc15', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', textAlign: 'left' }}>
                <strong>Importante:</strong> Antes de ingresar, asegúrate de seleccionar tu zona de pedido
                (botón "
                <span style={{ whiteSpace: 'nowrap' }}>📍 ¿Dónde quieres pedir?</span>"). Esto define desde qué sede se procesan tus pedidos.
              </div>
            </header>

            <form onSubmit={onSubmit} className="list">
              <input className="input" name="name" placeholder="Tu nombre" />
              <input className="input" name="email" type="email" placeholder="Email" required />
              <input className="input" name="password" type="password" placeholder="Contraseña" required />
              <button className="btn primary" type="submit" style={{ width: '100%', marginTop: '.25rem', height: '2.5rem' }}>Ingresar</button>
            </form>

            {msg && (
              <div style={{ marginTop: '1rem', fontSize: '13px', color: msg.toLowerCase().includes('error') ? '#b91c1c' : '#03592e' }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
