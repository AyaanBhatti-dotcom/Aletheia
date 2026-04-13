import { NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import DashboardPage from './pages/DashboardPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import SymptomLogPage from './pages/SymptomLogPage.jsx'
import PeriodTrackerPage from './pages/PeriodTrackerPage.jsx'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Symptom log' },
  { to: '/tracker', label: 'Period tracker' },
  { to: '/insights', label: 'Insights' },
  { to: '/faq', label: 'FAQ' },
]

function App() {
  return (
    <div className="app-shell">
      <main className="page-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/log" element={<SymptomLogPage />} />
          <Route path="/tracker" element={<PeriodTrackerPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/faq" element={<FaqPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'bottom-nav__link bottom-nav__link--active' : 'bottom-nav__link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
