import { useEffect } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './stores/auth'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssistantPage } from './pages/AssistantPage'
import { LogMealPage } from './pages/LogMealPage'
import { PlannerPage } from './pages/PlannerPage'
import { HistoryPage } from './pages/HistoryPage'
import { Spinner } from './components/ui'

const NAV = [
  { to: '/', label: 'Today' },
  { to: '/assistant', label: 'Ask AI' },
  { to: '/log', label: 'Log' },
  { to: '/plan', label: 'Plan' },
  { to: '/history', label: 'History' },
]

function Shell() {
  const { signOut } = useAuth()
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-brand-700">
          Meal Minds
        </Link>
        <button className="text-xs text-stone-400 hover:text-stone-600" onClick={signOut}>
          Sign out
        </button>
      </header>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/log" element={<LogMealPage />} />
        <Route path="/plan" element={<PlannerPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-xl">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-xs font-medium ${
                  isActive ? 'text-brand-700' : 'text-stone-400 hover:text-stone-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  const { session, profile, loading, init } = useAuth()

  useEffect(() => {
    init()
  }, [init])

  if (loading) return <Spinner />
  if (!session) return <AuthPage />
  if (!profile) return <OnboardingPage />

  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
