import React, { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'
import { api, formatPrice, getTenantId } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Menu() {
  const [items, setItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const { items: cart, add, remove, clear, total } = useCart()
  const nav = useNavigate()
  const { auth } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    // Leer categoría seleccionada del localStorage para mantener preferencia entre vistas
    const cat = localStorage.getItem('selectedCategory') || ''
    setSelectedCategory(cat)
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/menu')
        const all = Array.isArray(data) ? data : (data.items || [])
        setAllItems(all)

        let base = all
        // Aplicar filtro de categoría si existe (backend usa campo "categoria")
        if (selectedCategory) {
          base = base.filter(item => {
            const itemCat = (item.categoria || item.category || '').toLowerCase().trim()
            const selectedCat = selectedCategory.toLowerCase().trim()
            // Coincidencia exacta o parcial
            return itemCat === selectedCat || itemCat.includes(selectedCat) || selectedCat.includes(itemCat)
          })
        }

        const sorted = [...base].sort((a, b) => {
          const priceA = a.precio || a.price || 0
          const priceB = b.precio || b.price || 0
          const diff = priceA - priceB
          return sortOrder === 'asc' ? diff : -diff
        })
        setItems(sorted)
      } catch (e) { 
        console.error('Error cargando menú:', e)
        setErr('Error cargando menú: ' + (e.message || 'Error desconocido'))
      } finally { setLoading(false) }
    })()
  }, [selectedCategory, sortOrder])

  // Categorías únicas calculadas a partir de los productos cargados
  const categoryOptions = useMemo(() => {
    const base = Array.from(new Set(allItems
      .map(item => item.categoria || item.category)
      .filter(Boolean)
      .map(x => String(x))))
    return base
  }, [allItems])

  async function createOrder(ev) {
    ev.preventDefault()
    if (!cart.length) {
      alert('Tu carrito está vacío')
      return
    }
    if (!auth?.id) {
      alert('Debes iniciar sesión para crear un pedido. Redirigiendo al login...')
      nav('/login')
      return
    }
    const ok = window.confirm('Pagar ahora (solo pago web).\n\nAl aceptar crearemos tu pedido con pago web registrado.')
    if (!ok) {
      return
    }
    const tenant_id = getTenantId()
    if (!tenant_id) {
      alert('Error: No se encontró tenant_id. Por favor recarga la página.')
      return
    }
    const payload = {
      id_customer: auth.id,
      tenant_id,
      list_id_products: cart.map(x => x.id_producto).filter(Boolean),
    }
    if (!payload.list_id_products.length) {
      alert('Error: No hay productos válidos en el carrito')
      return
    }
    try {
      const res = await api('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      const orderId = res.id_pedido || res.id_order || res.id
      if (orderId) {
        showToast({ type: 'success', message: `¡Pedido #${orderId} creado exitosamente!` })
        clear()
        nav(`/track?id=${encodeURIComponent(orderId)}`)
      } else {
        alert('Pedido creado pero no se recibió ID. Revisa en "Rastrear pedido"')
      }
    } catch (e) {
      console.error('Error al crear pedido:', e)
      const errorMsg = e.message || 'No se pudo crear el pedido'
      showToast({ type: 'error', message: `Error: ${errorMsg}` })
      alert(`Error: ${errorMsg}`)
    }
  }

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Encabezado del menú */}
      <section style={{ padding: '2.5rem 1.5rem 1rem', background: '#008037', color: '#fff' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 className="appTitle" style={{ fontSize: '32px', marginBottom: '.4rem' }}>Menú para delivery</h1>
          <p style={{ fontSize: '14px', maxWidth: '520px', lineHeight: 1.7 }}>
            Elige tus combos, papas y alitas favoritas. Agrega al carrito y confirma tu pedido cuando estés listo.
          </p>
        </div>
      </section>

      <section style={{ padding: '1.5rem 1.5rem 3rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <section className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.75rem', alignItems: 'flex-start' }}>
            {/* Columna izquierda: productos */}
            <div>
              <header style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '.75rem' }}>
                  <h2 className="appTitle" style={{ color: '#03592e', fontSize: '24px', margin: 0 }}>
                    Nuestro menú {selectedCategory && `- ${selectedCategory}`}
                  </h2>
                  {selectedCategory && (
                    <button
                      className="btn"
                      onClick={() => {
                        setSelectedCategory('')
                        localStorage.removeItem('selectedCategory')
                      }}
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>Ordenar por:</span>
                  <button
                    className="btn"
                    style={{
                      fontSize: '13px',
                      padding: '0 .9rem',
                      background: sortOrder === 'asc' ? '#dcfce7' : '#fff',
                      borderColor: sortOrder === 'asc' ? '#16a34a' : '#e5e7eb'
                    }}
                    onClick={() => setSortOrder('asc')}
                  >
                    Más barato primero
                  </button>
                  <button
                    className="btn"
                    style={{
                      fontSize: '13px',
                      padding: '0 .9rem',
                      background: sortOrder === 'desc' ? '#dcfce7' : '#fff',
                      borderColor: sortOrder === 'desc' ? '#16a34a' : '#e5e7eb'
                    }}
                    onClick={() => setSortOrder('desc')}
                  >
                    Más caro primero
                  </button>
                </div>

                {/* Barra de categorías como píldoras */}
                {categoryOptions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.5rem' }}>
                    <button
                      className="btn"
                      style={{ fontSize: '13px', padding: '0 .9rem', background: selectedCategory ? '#fff' : '#dcfce7' }}
                      onClick={() => {
                        setSelectedCategory('')
                        localStorage.removeItem('selectedCategory')
                      }}
                    >
                      Todas
                    </button>
                    {categoryOptions.map(cat => {
                      const isActive = selectedCategory && cat && cat.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
                      return (
                        <button
                          key={cat}
                          className="btn"
                          style={{
                            fontSize: '13px',
                            padding: '0 .9rem',
                            background: isActive ? '#dcfce7' : '#fff',
                            borderColor: isActive ? '#16a34a' : '#e5e7eb'
                          }}
                          onClick={() => {
                            const val = String(cat)
                            setSelectedCategory(val)
                            localStorage.setItem('selectedCategory', val)
                          }}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                )}
              </header>

              {loading ? <div className="card">Cargando…</div> : err ? <div className="card">{err}</div> : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '1rem' }}>
                  {items.map(item => (
                    <div key={item.id_producto || item.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                        {/* Imagen del producto si existe */}
                        {item.imagen || item.image || item.image_url ? (
                          <img
                            src={item.imagen || item.image || item.image_url}
                            alt={item.nombre || item.name}
                            style={{ width:'100%', height:'150px', borderRadius:'8px', objectFit:'cover', marginBottom:'.5rem' }}
                          />
                        ) : (
                          <div style={{ width:'100%', height:'150px', background:'#f0f0f0', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px', marginBottom:'.5rem' }}>
                            🍕
                          </div>
                        )}
                        <div style={{ fontWeight:600, fontSize:'16px' }}>{item.nombre || item.name}</div>
                        <div className="price" style={{ fontSize:'18px' }}>{formatPrice(item.precio || item.price || 0)}</div>
                        <button
                          className="btn primary"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const product = {
                              id_producto: item.id_producto || item.id || item.sku,
                              nombre: item.nombre || item.name,
                              precio: item.precio || item.price || 0,
                              imagen: item.imagen || item.image || item.image_url,
                              descripcion: item.descripcion || item.description || ''
                            }
                            if (!product.id_producto) {
                              showToast({ type: 'error', message: 'Error: Producto sin ID válido' })
                              return
                            }
                            add(product)
                            showToast({ type: 'success', message: `${product.nombre} agregado al carrito` })
                          }}
                          style={{ width:'100%' }}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Columna derecha: carrito */}
            <aside className="card" style={{ position:'sticky', top:'5rem' }}>
            <h2 className="appTitle" style={{ marginBottom: '.5rem' }}>Tu carrito</h2>
            <div className="list">
              {cart.map(x => (
                <div key={x.id_producto} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'.75rem' }}>
                    <div>
                      <div>{x.nombre}</div>
                      <div className="price">{formatPrice(x.precio)} × {x.qty}</div>
                    </div>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.preventDefault()
                        remove(x.id_producto)
                        showToast({ type: 'info', message: `${x.nombre} removido del carrito` })
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1rem' }}>
              <div>Total</div>
              <div className="price">{formatPrice(total)}</div>
            </div>
            <hr style={{ margin:'1rem 0', border:'none', borderTop:'1px solid #eee' }} />
            {!auth?.id && (
              <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '8px', marginBottom: '1rem' }}>
                <strong>⚠️ Debes iniciar sesión para crear un pedido</strong>
                <button className="btn primary" onClick={() => nav('/login')} style={{ width: '100%', marginTop: '0.5rem' }}>
                  Ir a Login
                </button>
              </div>
            )}
            <form onSubmit={createOrder} className="list">
              <button
                className="btn primary"
                type="submit"
                disabled={!auth?.id || !cart.length}
                style={{ width: '100%' }}
              >
                {!auth?.id ? 'Inicia sesión primero' : cart.length ? 'Confirmar pedido' : 'Carrito vacío'}
              </button>
            </form>
          </aside>
        </section>
      </div>
      </section>
    </main>
  )
}
