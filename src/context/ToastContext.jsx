import React, { createContext, useContext, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  function showToast({ type = 'info', message = '', duration = 3000 }) {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }
  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div style={{ position:'fixed', right:16, bottom:16, display:'flex', flexDirection:'column', gap:8, zIndex:1000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: bg(t.type), color:'#fff', padding:'10px 12px', borderRadius:8, minWidth:220, boxShadow:'0 4px 10px rgba(0,0,0,.15)' }}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function bg(type){
  if(type==='success') return '#16a34a'
  if(type==='error') return '#dc2626'
  if(type==='warning') return '#d97706'
  return '#03592e'
}

export function useToast(){ return useContext(ToastCtx) }
