import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Input, Label } from '../components/ui'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setInfo('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-700">Meal Minds</h1>
          <p className="mt-1 text-sm text-stone-500">
            Lose weight without the logging. AI plans your meals; you just eat them.
          </p>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-brand-700">{info}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-500">
            {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
            <button
              className="font-medium text-brand-700"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            >
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}
