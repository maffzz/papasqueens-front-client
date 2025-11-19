import React, { createContext, useContext, useEffect, useState } from 'react'
import { setAuth as persist, getAuth as read } from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => read())
  useEffect(() => { persist(auth) }, [auth])
  const login = (data) => setAuth(data)
  const logout = () => setAuth({})
  return <AuthCtx.Provider value={{ auth, login, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() { return useContext(AuthCtx) }
