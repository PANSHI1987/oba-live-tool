import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface PaymentPlan {
  id: string
  name: string
  price: number
  description: string
  duration: string
}

export const PLANS: PaymentPlan[] = [
  { id: 'monthly', name: '月度会员', price: 30, description: '30元/月', duration: '30天' },
  { id: 'quarterly', name: '季度会员', price: 60, description: '60元/3个月', duration: '90天' },
  { id: 'lifetime', name: '终身会员', price: 100, description: '100元/永久', duration: '永久' },
]

const TRIAL_DAYS = 7
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000

interface LicenseState {
  firstLaunchAt: number | null
  licensed: boolean
  planId: string | null
  orderId: string | null
  paying: boolean
  activatedAt: number | null
}

interface LicenseActions {
  initTrial: () => void
  isTrialExpired: () => boolean
  getRemainingMs: () => number
  getLicenseRemainingMs: () => number
  setPaying: (v: boolean) => void
  activateLicense: (planId: string, orderId: string) => void
  resetLicense: () => void
}

export const usePaymentStore = create<LicenseState & LicenseActions>()(
  persist(
    (set, get) => ({
      firstLaunchAt: null,
      licensed: false,
      planId: null,
      orderId: null,
      paying: false,
      activatedAt: null,

      initTrial: () => {
        if (get().firstLaunchAt === null) {
          set({ firstLaunchAt: Date.now() })
        }
      },

      isTrialExpired: () => {
        const { firstLaunchAt, licensed } = get()
        if (licensed) return false
        if (!firstLaunchAt) return false
        return Date.now() - firstLaunchAt > TRIAL_MS
      },

      getRemainingMs: () => {
        const { firstLaunchAt, licensed } = get()
        if (licensed) return Number.POSITIVE_INFINITY
        if (!firstLaunchAt) return TRIAL_MS
        const remaining = TRIAL_MS - (Date.now() - firstLaunchAt)
        return Math.max(0, remaining)
      },

      setPaying: (v: boolean) => set({ paying: v }),

      activateLicense: (planId: string, orderId: string) => {
        set({ licensed: true, planId, orderId, paying: false, activatedAt: Date.now() })
      },

      getLicenseRemainingMs: () => {
        const { planId, activatedAt, licensed } = get()
        if (!licensed || !activatedAt) return 0
        if (planId === 'lifetime') return Number.POSITIVE_INFINITY
        const durationMs = planId === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 90 * 24 * 60 * 60 * 1000
        const elapsed = Date.now() - activatedAt
        return Math.max(0, durationMs - elapsed)
      },

      resetLicense: () => {
        set({
          firstLaunchAt: Date.now(),
          licensed: false,
          planId: null,
          orderId: null,
          paying: false,
        })
      },
    }),
    {
      name: 'live-assistant-license',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
