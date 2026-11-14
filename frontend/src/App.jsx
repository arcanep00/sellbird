import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import EmailGen from './pages/EmailGen'
import Discover from './pages/Discover'
import Products from './pages/Products'
import ModelStatus from './components/ModelStatus'

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-icon">🦅</span>
            <span className="brand-name">Harvey</span>
            <span className="brand-sub">Local Sales Agent</span>
          </div>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              📊 Dashboard
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              📦 Products
            </NavLink>
            <NavLink to="/prospects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              👥 Prospects
            </NavLink>
            <NavLink to="/email" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ✉️ Email Gen
            </NavLink>
            <NavLink to="/discover" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              🔍 Discover
            </NavLink>
          </nav>
          <div className="sidebar-bottom">
            <ModelStatus />
          </div>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/email" element={<EmailGen />} />
            <Route path="/discover" element={<Discover />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
