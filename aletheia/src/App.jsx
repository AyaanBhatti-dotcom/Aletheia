import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { useDemo } from './context/DemoContext.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import LogDetailPage from './pages/LogDetailPage.jsx'
import LogsPage from './pages/LogsPage.jsx'
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
const REPLAY_TOUR_EVENT = 'aletheia:replay-tour'
const tourSteps = [
  {
    eyebrow: 'Welcome',
    title: 'Welcome to Aletheia.',
    body:
      'This is your private place to track symptoms, follow your cycle, and turn scattered notes into something you can actually use.',
    highlights: [
      'Everything stays in this browser unless you choose to export it.',
      'You can move at your own pace and start with as little information as you want.',
    ],
  },
  {
    eyebrow: 'Track',
    title: 'Log symptoms and cycle changes day by day.',
    body:
      'Use Symptom log for pain, body areas, notes, and photos. Use Cycle to record flow, discharge, pain scales, and the calendar view.',
    highlights: [
      'Tap dates in the cycle calendar to jump into a specific day.',
      'Your entries build a timeline you can browse later in All logs.',
    ],
  },
  {
    eyebrow: 'Review',
    title: 'Open past logs and look for patterns.',
    body:
      'The dashboard gives you a quick summary, while Insights turns your entries into flare history, top symptoms, phase pain, and 30-day averages.',
    highlights: [
      'Recent activity on the home screen opens into full entry details.',
      'Insights becomes more useful as you log more days.',
    ],
  },
  {
    eyebrow: 'Export',
    title: 'Create a PDF report when you need to share context.',
    body:
      'From the dashboard, use Export report to generate a local PDF with your symptom timeline, cycle summary, and pattern overview.',
    highlights: [
      'Reports are generated on your device.',
      'You can also export raw data from Settings as JSON.',
    ],
  },
  {
    eyebrow: 'Privacy',
    title: 'Privacy and encryption are built into the app.',
    body:
      'Settings lets you activate encryption with a passphrase, export or clear data, and review the privacy notice for how everything is stored.',
    highlights: [
      'Data is stored locally in this browser.',
      'No entries are transmitted to a server by default.',
    ],
  },
]

function App() {
  const { isDemoMode, toggleDemo } = useDemo()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_STORAGE_KEY),
  )
  const [tourStep, setTourStep] = useState(0)

  useEffect(() => {
    function handleReplayTour() {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY)
      setTourStep(0)
      setShowOnboarding(true)
    }

    window.addEventListener(REPLAY_TOUR_EVENT, handleReplayTour)

    return () => {
      window.removeEventListener(REPLAY_TOUR_EVENT, handleReplayTour)
    }
  }, [])

  function completeOnboarding(enableDemoMode) {
    if (enableDemoMode && !isDemoMode) {
      toggleDemo()
    }
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setTourStep(0)
    setShowOnboarding(false)
  }

  return (
    <div className="app-shell">
      {showOnboarding && (
        <div className="onboarding-screen">
          <div className="onboarding-panel">
            <div className="onboarding-orb" aria-hidden="true" />
            <div className="onboarding-progress">
              {tourSteps.map((step, index) => (
                <span
                  key={step.title}
                  className={`onboarding-progress__dot${index === tourStep ? ' onboarding-progress__dot--active' : ''}`}
                />
              ))}
            </div>
            <p className="onboarding-kicker">{tourSteps[tourStep].eyebrow}</p>
            <h1 className="onboarding-title">{tourSteps[tourStep].title}</h1>
            <p className="onboarding-copy">{tourSteps[tourStep].body}</p>
            <div className="onboarding-notes">
              {tourSteps[tourStep].highlights.map((item) => (
                <div key={item} className="onboarding-note">
                  <span className="onboarding-note__mark" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="onboarding-actions">
              {tourStep > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTourStep((currentStep) => currentStep - 1)}
                >
                  Back
                </button>
              )}
              {tourStep < tourSteps.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setTourStep((currentStep) => currentStep + 1)}
                >
                  Next
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => completeOnboarding(false)}>
                  Get started
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (tourStep === tourSteps.length - 1 ? completeOnboarding(true) : completeOnboarding(false))}
              >
                {tourStep === tourSteps.length - 1 ? 'Try demo' : 'Skip tour'}
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

      {isDemoMode && (
        <div className="demo-banner">
          <span>Demo mode active</span>
          <button type="button" className="demo-banner__button" onClick={toggleDemo}>
            Exit demo
          </button>
        </div>
      )}

      <main className="page-content">
        <div key={location.pathname} className="route-stage">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/log" element={<SymptomLogPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/logs/:entryType/:entryId" element={<LogDetailPage />} />
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
