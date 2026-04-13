import { useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { useDemo } from './context/DemoContext.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SymptomLogPage from './pages/SymptomLogPage.jsx'
import PeriodTrackerPage from './pages/PeriodTrackerPage.jsx'

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    to: '/log',
    label: 'Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
        <path d="M17.5 3.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 7.5-7.5z" />
      </svg>
    ),
  },
  {
    to: '/tracker',
    label: 'Cycle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 007-7c0-5-7-13-7-13S5 10 5 15a7 7 0 007 7z" />
      </svg>
    ),
  },
  {
    to: '/insights',
    label: 'Insights',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

const ONBOARDING_STORAGE_KEY = 'aletheia-onboarding-complete'

function App() {
  const { isDemoMode, toggleDemo } = useDemo()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_STORAGE_KEY),
  )

  function completeOnboarding(enableDemoMode) {
    if (enableDemoMode && !isDemoMode) {
      toggleDemo()
    }
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setShowOnboarding(false)
  }

  return (
    <div className="app-shell">
      {showOnboarding && (
        <div className="onboarding-screen">
          <div className="onboarding-panel">
            <div className="onboarding-orb" aria-hidden="true" />
            <p className="onboarding-kicker">Aletheia</p>
            <h1 className="onboarding-title">A private place to understand your body.</h1>
            <p className="onboarding-copy">
              Track symptoms, log cycle changes, and review insights — stored entirely on this device.
            </p>
            <div className="onboarding-actions">
              <button type="button" className="btn-primary" onClick={() => completeOnboarding(false)}>
                Get started
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => completeOnboarding(true)}
              >
                Try demo
              </button>
            </div>
            <div className="onboarding-footer">
              <span className="privacy-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Stored locally · never uploaded
              </span>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && <div className="demo-banner">Demo mode active</div>}

      <main className="page-content">
        <div key={location.pathname} className="route-stage">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/log" element={<SymptomLogPage />} />
            <Route path="/tracker" element={<PeriodTrackerPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'bottom-nav__link bottom-nav__link--active' : 'bottom-nav__link'
            }
          >
            <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
