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
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Symptom log' },
  { to: '/tracker', label: 'Period tracker' },
  { to: '/insights', label: 'Insights' },
  { to: '/faq', label: 'FAQ' },
  { to: '/settings', label: 'Settings', hasIcon: true },
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
            <div className="onboarding-mark" aria-hidden="true" />
            <p className="onboarding-kicker">Aletheia</p>
            <h1 className="onboarding-title">A private place to understand your cycle and pain patterns.</h1>
            <p className="onboarding-copy">
              Track symptoms, log cycle changes, and review insights stored locally in this browser.
            </p>
            <div className="onboarding-actions">
              <button type="button" onClick={() => completeOnboarding(false)}>
                Get started
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => completeOnboarding(true)}
              >
                Try demo
              </button>
            </div>
          </div>
        </div>
      )}
      {isDemoMode && <div className="demo-banner">Demo mode</div>}
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
            {item.hasIcon ? (
              <span className="bottom-nav__content">
                <svg
                  className="bottom-nav__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M12 3.5 13.6 5.6 16.2 5.3 16.8 7.8 19.3 9 18.1 11.3 19.3 13.7 16.8 14.9 16.2 17.4 13.6 17.1 12 19.2 10.4 17.1 7.8 17.4 7.2 14.9 4.7 13.7 5.9 11.3 4.7 9 7.2 7.8 7.8 5.3 10.4 5.6Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="11.3" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>{item.label}</span>
              </span>
            ) : (
              item.label
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
