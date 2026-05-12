import { NavLink, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import SosPage from './pages/SosPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandTitle">Cứu hộ mùa lũ</div>
          <div className="brandSub">Giao diện điều phối</div>
        </div>

        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            Bảng điều khiển
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            Bản đồ
          </NavLink>
          <NavLink to="/sos" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            SOS
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            Cài đặt
          </NavLink>
        </nav>

        <div className="sidebarFooter">UI thao tác API (React)</div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/sos" element={<SosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
