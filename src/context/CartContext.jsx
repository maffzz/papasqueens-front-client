import React, { createContext, useContext, useMemo, useState } from 'react'

const CartCtx = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] } })
  const save = (v) => { setItems(v); localStorage.setItem('cart', JSON.stringify(v)) }
  const add = (item) => { const c = [...items]; const i = c.findIndex(x => x.id_producto === item.id_producto); if (i>=0) c[i].qty += 1; else c.push({ ...item, qty: 1 }); save(c) }
  const remove = (id) => save(items.filter(x => x.id_producto !== id))
  const clear = () => save([])
  const total = useMemo(() => items.reduce((s, x) => s + (x.precio||0) * x.qty, 0), [items])
  return <CartCtx.Provider value={{ items, add, remove, clear, total }}>{children}</CartCtx.Provider>
}

export function useCart() { return useContext(CartCtx) }
