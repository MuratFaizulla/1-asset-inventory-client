import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import AssetsPage from './pages/AssetsPage'
import DashboardPage from './pages/DashboardPage'
import AssetDetailPage from './pages/AssetDetailPage'
import ImportPage from './pages/ImportPage'
import InventoryListPage from './pages/InventoryListPage'
import InventorySessionPage from './pages/InventorySessionPage'
import RelocationsPage from './pages/RelocationsPage'
import AssetTypesPage from './pages/AssetTypesPage'
import CollectionListPage from './pages/CollectionListPage'
import CollectionDetailPage from './pages/CollectionDetailPage'
import { LocationsListPage, LocationDetailPage } from './pages/LocationsPage'
import './App.css'

// Закрываем меню при смене маршрута
function MenuCloser({ onClose }: { onClose: () => void }) {
  const location = useLocation()
  useEffect(() => { onClose() }, [location.pathname, onClose])
  return null
}

export default function App() {
  const [showExtra,  setShowExtra]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMenu = useCallback(() => setMobileOpen(false), [])

  const navCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-item active' : 'nav-item'

  return (
    <BrowserRouter>
      <MenuCloser onClose={closeMenu} />
      <div className="app">

        {/* ── Бургер-кнопка (только мобильный) ── */}
        <button
          className="burger-btn"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Меню"
        >
          <span className={`burger-icon ${mobileOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>

        {/* ── Затемнение фона ── */}
        {mobileOpen && (
          <div className="sidebar-backdrop" onClick={closeMenu} />
        )}

        {/* ── Боковая панель ── */}
        <nav className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-logo">
            <span className="logo-icon">📦</span>
            <span className="logo-text">Инвентаризация</span>
            {/* Крестик закрытия на мобильном */}
            <button className="sidebar-close desktop-hide" onClick={closeMenu}>✕</button>
          </div>

          <NavLink to="/" end className={navCls}>
            <span>🏠</span> Дашборд
          </NavLink>
          <NavLink to="/assets" className={navCls}>
            <span>🗂️</span> Основные средства
          </NavLink>
          <NavLink to="/asset-types" className={navCls}>
            <span>📦</span> Виды ОС
          </NavLink>
          <NavLink to="/locations" className={navCls}>
            <span>🏫</span> Кабинеты
          </NavLink>
          <NavLink to="/inventory" className={navCls}>
            <span>📋</span> Инвентаризация
          </NavLink>
          <NavLink to="/import" className={navCls}>
            <span>📤</span> Импорт Excel
          </NavLink>

          {/* Разделитель + Инструменты (десктоп) */}
          <div className="sidebar-spacer" />
          <div className="sidebar-tools-block">
            <button
              onClick={() => setShowExtra(v => !v)}
              style={{
                width: '100%', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', cursor: 'pointer', borderRadius: 8,
                color: 'var(--text3)', fontSize: 12, fontWeight: 600,
              }}
            >
              <span>Инструменты</span>
              <span style={{ fontSize: 10 }}>{showExtra ? '▲' : '▼'}</span>
            </button>
            {showExtra && (
              <NavLink to="/collection" className={navCls}>
                <span>📥</span> Сбор ОС
              </NavLink>
            )}
          </div>

          {/* Сбор ОС — всегда виден на мобильном */}
          <NavLink to="/collection" className={({ isActive }) =>
            `nav-item mobile-menu-item ${isActive ? 'active' : ''}`
          }>
            <span>📥</span> Сбор ОС
          </NavLink>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/"                           element={<DashboardPage />} />
            <Route path="/assets"                     element={<AssetsPage />} />
            <Route path="/assets/:id"                 element={<AssetDetailPage />} />
            <Route path="/inventory"                  element={<InventoryListPage />} />
            <Route path="/inventory/:id"              element={<InventorySessionPage />} />
            <Route path="/inventory/:id/relocations"  element={<RelocationsPage />} />
            <Route path="/asset-types"                element={<AssetTypesPage />} />
            <Route path="/locations"                  element={<LocationsListPage />} />
            <Route path="/locations/:id"              element={<LocationDetailPage />} />
            <Route path="/collection"                 element={<CollectionListPage />} />
            <Route path="/collection/:id"             element={<CollectionDetailPage />} />
            <Route path="/import"                     element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
