import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import AssetsPage from './pages/AssetsPage'
import DashboardPage from './pages/DashboardPage'
import AssetDetailPage from './pages/AssetDetailPage'
import ImportPage from './pages/ImportPage'
import InventoryListPage from './pages/InventoryListPage'
import InventorySessionPage from './pages/InventorySessionPage'
import RelocationsPage from './pages/RelocationsPage'
import AssetTypesPage from './pages/AssetTypesPage'
import { LocationsListPage, LocationDetailPage } from './pages/LocationsPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <span className="logo-icon">📦</span>
            <span className="logo-text">Инвентаризация</span>
          </div>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>🏠</span> Дашборд
          </NavLink>
          <NavLink to="/assets" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>🗂️</span> Основные средства
          </NavLink>
          <NavLink to="/asset-types" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>📦</span> Виды ОС
          </NavLink>
          <NavLink to="/locations" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>🏫</span> Кабинеты
          </NavLink>
          <NavLink to="/inventory" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>📋</span> Инвентаризация
          </NavLink>
          <NavLink to="/import" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span>📥</span> Импорт Excel
          </NavLink>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/inventory" element={<InventoryListPage />} />
            <Route path="/inventory/:id" element={<InventorySessionPage />} />
            <Route path="/inventory/:id/relocations" element={<RelocationsPage />} />
            <Route path="/asset-types" element={<AssetTypesPage />} />
            <Route path="/locations" element={<LocationsListPage />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}