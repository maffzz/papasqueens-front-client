import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../api/client'

export default function Cart() {
  const nav = useNavigate()
  const { auth } = useAuth()
  const { items, remove, clear, total } = useCart()

  const deliveryFee = 2.50
  const finalTotal = total + (items.length > 0 ? deliveryFee : 0)

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      remove(id)
    }
  }

  if (items.length === 0) {
    return (
      <main style={{ background: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <Link 
            to="/menu" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: '#03592e', 
              textDecoration: 'none',
              marginBottom: '1rem',
              fontSize: '16px'
            }}
          >
            ← Volver al menú
          </Link>
          
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🛒</div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Tu carrito está vacío
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Agrega deliciosas alitas y papas a tu pedido
            </p>
            <Link
              to="/menu"
              style={{
                display: 'inline-block',
                background: '#03592e',
                color: '#fff',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Explorar menú
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link 
            to="/menu" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: '#03592e', 
              textDecoration: 'none',
              marginBottom: '1rem',
              fontSize: '16px'
            }}
          >
            ← Volver al menú
          </Link>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#111827',
            margin: 0 
          }}>
            Tu carrito
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Cart Items */}
          <div>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </h2>
              </div>

              <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                {items.map(item => (
                  <div key={item.id_producto} style={{ padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                    {item.imagen || item.image || item.image_url ? (
                      <img
                        src={item.imagen || item.image || item.image_url}
                        alt={item.nombre || 'Producto'}
                        style={{
                          width: '96px',
                          height: '96px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '96px',
                        height: '96px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        flexShrink: 0
                      }}>
                        🍟
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        {item.nombre}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.75rem' }}>
                        {item.descripcion || 'Delicioso producto'}
                      </p>
                      <p style={{
                        fontWeight: 'bold',
                        color: '#03592e',
                        fontSize: '18px',
                        marginBottom: '0.75rem'
                      }}>
                        {formatPrice(item.precio * item.qty)}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => updateQuantity(item.id_producto, item.qty - 1)}
                          style={{
                            padding: '0.25rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          −
                        </button>
                        <span style={{ 
                          width: '32px', 
                          textAlign: 'center', 
                          fontWeight: '600' 
                        }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id_producto, item.qty + 1)}
                          style={{
                            padding: '0.25rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => remove(item.id_producto)}
                          style={{
                            marginLeft: 'auto',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ 
                padding: '1.5rem', 
                background: '#f9fafb', 
                borderTop: '1px solid #e5e7eb' 
              }}>
                <button
                  onClick={clear}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Vaciar carrito
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              position: 'sticky',
              top: '5rem'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '1.5rem'
              }}>
                Resumen del pedido
              </h3>

              <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: '#374151',
                  marginBottom: '1rem' 
                }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: '600' }}>{formatPrice(total)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: '#374151' 
                }}>
                  <span>Envío</span>
                  <span style={{ fontWeight: '600' }}>{formatPrice(deliveryFee)}</span>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem' 
              }}>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827' 
                }}>
                  Total
                </span>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#03592e' 
                }}>
                  {formatPrice(finalTotal)}
                </span>
              </div>

              {!auth?.id && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fef3c7', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  border: '1px solid #fbbf24'
                }}>
                  <strong style={{ color: '#92400e' }}>
                    ⚠️ Debes iniciar sesión para crear un pedido
                  </strong>
                  <button
                    onClick={() => nav('/login')}
                    style={{
                      width: '100%',
                      marginTop: '0.5rem',
                      background: '#03592e',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Ir a Login
                  </button>
                </div>
              )}

              {auth?.id && !((auth.address && String(auth.address).trim()) || (auth.direccion && String(auth.direccion).trim())) && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fee2e2', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  border: '1px solid #fca5a5'
                }}>
                  <strong style={{ color: '#b91c1c' }}>
                    ⚠️ Debes registrar tu dirección para poder crear un pedido
                  </strong>
                  <button
                    onClick={() => nav('/account')}
                    style={{
                      width: '100%',
                      marginTop: '0.5rem',
                      background: '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Ir a Mi cuenta
                  </button>
                </div>
              )}

              <button
                onClick={() => nav('/menu')}
                disabled={
                  !auth?.id ||
                  !items.length ||
                  !((auth?.address && String(auth.address).trim()) || (auth?.direccion && String(auth.direccion).trim()))
                }
                style={{
                  width: '100%',
                  background:
                    auth?.id && items.length && ((auth?.address && String(auth.address).trim()) || (auth?.direccion && String(auth.direccion).trim()))
                      ? '#03592e'
                      : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: auth?.id && items.length ? 'pointer' : 'not-allowed',
                  marginBottom: '0.75rem'
                }}
              >
                {!auth?.id
                  ? 'Inicia sesión primero'
                  : !items.length
                    ? 'Carrito vacío'
                    : !((auth?.address && String(auth.address).trim()) || (auth?.direccion && String(auth.direccion).trim()))
                      ? 'Completa tu dirección en Mi cuenta'
                      : 'Continuar con el pedido'}
              </button>

              <button
                onClick={() => nav('/menu')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#03592e',
                  border: '2px solid #03592e',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#111827', color: '#fff', padding: '2rem 0', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af' }}>
            © 2025 Papas Queens. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  )
}
