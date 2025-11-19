import React from 'react'
import { Link } from 'react-router-dom'

export default function ServerError() {
  return (
    <main style={{ minHeight: 'calc(100vh - 80px)', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
      <section className="container" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', borderRadius: '1.25rem', boxShadow: '0 18px 40px rgba(15,23,42,0.16)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <img
              src="/error_500.png"
              alt="Error 500 Papas Queens"
              style={{ maxWidth: 220, width: '100%', margin: '0 auto', display: 'block' }}
            />
          </div>
          <h1 className="appTitle" style={{ color: '#03592e', fontSize: '26px', marginBottom: '.5rem' }}>
            Lo sentimos, algo salió mal
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '1.25rem' }}>
            Estamos trabajando para que sigas comiendo papitas y todo vuelva a la normalidad lo antes posible.
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '1.75rem' }}>
            Si el problema continúa, intenta recargar la página en unos minutos.
          </p>
          <Link
            to="/"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1.75rem' }}
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  )
}
