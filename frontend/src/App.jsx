import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import EmailGen from './pages/EmailGen'
import Discover from './pages/Discover'
import Products from './pages/Products'
import ModelStatus from './components/ModelStatus'

const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  products: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  prospects: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/>
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>
    </svg>
  ),
  email: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
    </svg>
  ),
  discover: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#4f8ef7"/>
              <path d="M8 24L16 8l8 16H8z" fill="white" opacity="0.9"/>
              <circle cx="16" cy="17" r="3" fill="#4f8ef7"/>
            </svg>
            <span className="brand-name">Harvey</span>
            <span className="brand-sub">Local Sales Agent</span>
          </div>

          <nav>
            <div className="nav-section-label">Overview</div>
            <NavItem to="/" icon={icons.dashboard} label="Dashboard" end />
            <NavItem to="/products" icon={icons.products} label="Products" />

            <div className="nav-section-label" style={{ marginTop: 8 }}>Workflow</div>
            <NavItem to="/prospects" icon={icons.prospects} label="Prospects" />
            <NavItem to="/email" icon={icons.email} label="Email Gen" />
            <NavItem to="/discover" icon={icons.discover} label="Discover" />
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
