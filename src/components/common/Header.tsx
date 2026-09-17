import { useEffect, useState, useCallback } from 'react'
import { Package, Clock } from 'lucide-react'
import { AccountSwitcher } from './AccountSwitcher'
import { usePaymentStore, PLANS } from '@/hooks/usePaymentStore'

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms)) return '永久'
  if (ms <= 0) return '已到期'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  if (days > 0) return `${days}天${hours}时${minutes}分`
  if (hours > 0) return `${hours}时${minutes}分${seconds}秒`
  return `${minutes}分${seconds}秒`
}

export function Header() {
  const licensed = usePaymentStore(s => s.licensed)
  const planId = usePaymentStore(s => s.planId)
  const [remaining, setRemaining] = useState(() => {
    const store = usePaymentStore.getState()
    return store.licensed ? store.getLicenseRemainingMs() : store.getRemainingMs()
  })

  const updateRemaining = useCallback(() => {
    const store = usePaymentStore.getState()
    setRemaining(store.licensed ? store.getLicenseRemainingMs() : store.getRemainingMs())
  }, [])

  useEffect(() => {
    const timer = setInterval(updateRemaining, 1000)
    return () => clearInterval(timer)
  }, [updateRemaining])

  const plan = PLANS.find(p => p.id === planId)

  return (
    <header className="w-full bg-white shadow-xs px-6 flex h-16 items-center justify-between">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-gray-800 sm:text-xl">直播小助理</h1>
      </div>

      <div className="flex items-center gap-4">
        {licensed && planId === 'lifetime' && (
          <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">终身会员 · 永久有效</span>
          </div>
        )}
        {licensed && planId !== 'lifetime' && remaining > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{plan?.name} · 剩余 {formatRemaining(remaining)}</span>
          </div>
        )}
        {licensed && planId !== 'lifetime' && remaining <= 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">会员已到期</span>
          </div>
        )}
        {!licensed && remaining > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">试用剩余 {formatRemaining(remaining)}</span>
          </div>
        )}
        {!licensed && remaining <= 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">试用已到期</span>
          </div>
        )}
        <AccountSwitcher />
      </div>
    </header>
  )
}
