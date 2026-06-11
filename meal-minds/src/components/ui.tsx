import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-stone-300',
    secondary: 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100',
    ghost: 'text-brand-700 hover:bg-brand-50',
  }[variant]
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-stone-500">{children}</label>
}

export function ProgressBar({
  value,
  max,
  warnOver = true,
}: {
  value: number
  max: number
  warnOver?: boolean
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const over = warnOver && value > max
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-brand-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
    </div>
  )
}

export function MacroPill({ label, grams }: { label: string; grams: number }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
      {label} {Math.round(grams)}g
    </span>
  )
}
