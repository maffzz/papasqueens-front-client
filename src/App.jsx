import { Routes, Route } from 'react-router-dom'
import CustomerHeader from './components/CustomerHeader'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Track from './pages/Track'
import Login from './pages/Login'
import Locales from './pages/Locales'
import Cart from './pages/Cart'
import ActiveOrders from './pages/ActiveOrders'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import Account from './pages/Account'

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <CustomerHeader />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/locales" element={<Locales />} />
            <Route path="/track" element={<Track />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<ActiveOrders />} />
            <Route path="/account" element={<Account />} />
            <Route path="/oops" element={<ServerError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}
