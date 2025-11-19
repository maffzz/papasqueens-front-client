import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function CustomerHeader() {
  const { auth, logout } = useAuth()
  const { items } = useCart()
  const nav = useNavigate()
  const cartCount = items.reduce((sum, item) => sum + (item.qty || 1), 0)
  const isLoggedIn = auth && auth.id
  const [showCategories, setShowCategories] = useState(false)
  const categoriesRef = useRef(null)

  const categories = ['Todos', 'Papas Clásicas', 'Papas Especiales', 'Bebidas', 'Postres', 'Combos']
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLocal, setSelectedLocal] = useState('')
  const [showLocales, setShowLocales] = useState(false)
  const localesRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
        setShowCategories(false)
      }
      if (localesRef.current && !localesRef.current.contains(event.target)) {
        setShowLocales(false)
      }
    }

    if (showCategories || showLocales) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategories, showLocales])

  return (
    <header className="header" style={{ background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div className="container" style={{ width: '100%' }}>
        {/* Primera fila: Logo, Categorías, Local, Iconos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid #03592e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src="https://tofuu.getjusto.com/orioneat-prod/ynBWKNhowKKGBQatZ-A4--LOGOTIPO.png" 
                  alt="Papas Queen's Logo" 
                  style={{ 
                    width: '42px', 
                    height: '42px', 
                    objectFit: 'cover'
                  }} 
                />
              </div>
            </Link>

            <div ref={localesRef} style={{ position: 'relative' }}>
              <button
                className="btn"
                onClick={(e) => {
                  e.preventDefault()
                  setShowLocales(!showLocales)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                📍 ¿Dónde quieres pedir? {selectedLocal && `(${selectedLocal})`}
              </button>
              {showLocales && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '200px'
                }}>
                  {['Lima', 'Barranco', 'Miraflores'].map(local => (
                    <button
                      key={local}
                      className="btn"
                      onClick={() => {
                        setSelectedLocal(local)
                        setShowLocales(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        background: selectedLocal === local ? '#f0f0f0' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedLocal === local ? '#f0f0f0' : '#fff'}
                    >
                      {local}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn"
              onClick={(e) => {
                e.preventDefault()
                const search = prompt('Buscar producto (próximamente)')
                if (search) nav(`/menu?search=${encodeURIComponent(search)}`)
              }}
              title="Buscar"
            >
              🔍
            </button>
            {isLoggedIn ? (
              <button
                className="btn"
                onClick={() => {
                  if (window.confirm('¿Quieres cerrar sesión?')) {
                    logout()
                    nav('/')
                  }
                }}
                style={{ padding: '0.5rem' }}
              >
                👤
              </button>
            ) : (
              <Link className="btn" to="/login" style={{ padding: '0.5rem' }}>→</Link>
            )}
            <button
              className="btn"
              onClick={() => nav('/cart')}
              style={{ position: 'relative', padding: '0.5rem' }}
            >
              🛒
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Segunda fila: Navegación */}
        <nav style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#03592e', fontWeight: 'bold', fontSize: '14px' }}>INICIO</Link>
          <Link to="/menu" style={{ textDecoration: 'none', color: '#03592e', fontWeight: 'bold', fontSize: '14px' }}>MENÚ</Link>
          <Link to="/locales" style={{ textDecoration: 'none', color: '#03592e', fontWeight: 'bold', fontSize: '14px' }}>LOCALES</Link>
          <Link to="/orders" style={{ textDecoration: 'none', color: '#03592e', fontWeight: 'bold', fontSize: '14px' }}>PEDIDOS</Link>
        </nav>
      </div>
    </header>
  )
}
