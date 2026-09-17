import { useEffect, useState, useRef } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePaymentStore, PLANS, type PaymentPlan } from '@/hooks/usePaymentStore'
import { useToast } from '@/hooks/useToast'
import { Check, CreditCard, Loader2 } from 'lucide-react'

export default function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null)
  const [paying, setPaying] = useState(false)
  const [tradeNo, setTradeNo] = useState<string | null>(null)
  const { activateLicense, licensed, isTrialExpired, getLicenseRemainingMs, planId } = usePaymentStore()
  const { toast } = useToast()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (licensed && getLicenseRemainingMs() > 0) return null

  const trialExpired = !licensed && isTrialExpired()
  const membershipExpired = licensed && planId !== 'lifetime' && getLicenseRemainingMs() <= 0

  // 自动轮询 ECS 检查支付状态
  useEffect(() => {
    if (!tradeNo || !paying) return

    pollingRef.current = setInterval(async () => {
      try {
        const result = await window.ipcRenderer.invoke(IPC_CHANNELS.payment.queryOrder, tradeNo)
        if (result.paid) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          const store = usePaymentStore.getState()
          store.activateLicense(selectedPlan?.id || 'monthly', tradeNo)
          toast.success('支付成功！软件已解锁')
        }
      } catch {
        // 忽略查询错误，继续轮询
      }
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [tradeNo, paying, selectedPlan, toast])

  // 切回应用时也检查一次
  useEffect(() => {
    const handleFocus = async () => {
      if (tradeNo && paying) {
        try {
          const result = await window.ipcRenderer.invoke(IPC_CHANNELS.payment.queryOrder, tradeNo)
          if (result.paid) {
            if (pollingRef.current) clearInterval(pollingRef.current)
            const store = usePaymentStore.getState()
            store.activateLicense(selectedPlan?.id || 'monthly', tradeNo)
            toast.success('支付成功！软件已解锁')
          }
        } catch {}
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [tradeNo, paying, selectedPlan, toast])

  const handlePay = async (plan: PaymentPlan) => {
    setSelectedPlan(plan)
    setPaying(true)

    try {
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.payment.createOrder, {
        name: `直播小助理 - ${plan.name}`,
        money: String(plan.price),
        planId: plan.id,
      })

      if (result.code === 1 && result.trade_no) {
        setTradeNo(result.trade_no)
        if (result.payurl) {
          window.ipcRenderer.invoke(IPC_CHANNELS.app.openExternal, result.payurl)
        }
        toast.success('订单已创建，请在浏览器中完成支付')
      } else {
        toast.error(result.msg || '创建订单失败')
        setPaying(false)
      }
    } catch {
      toast.error('创建订单失败，请检查网络')
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">直播小助理</h1>
          {trialExpired && (
            <p className="text-lg text-muted-foreground">7天免费试用已到期，请选择套餐继续使用</p>
          )}
          {membershipExpired && (
            <p className="text-lg text-muted-foreground">您的会员已到期，请续费继续使用</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map(plan => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                selectedPlan?.id === plan.id
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:scale-[1.02]'
              }`}
              onClick={() => !paying && setSelectedPlan(plan)}
            >
              {plan.id === 'lifetime' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  最划算
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  ¥{plan.price}
                </div>
                <p className="text-sm text-muted-foreground">{plan.duration}</p>
                <div className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>自动弹窗</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>自动发言</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>自动回复</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>AI 助手</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {paying && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>支付完成后系统将自动激活，请在浏览器中完成支付...</span>
            </div>
          )}

          <Button
            size="lg"
            disabled={!selectedPlan || paying}
            onClick={() => selectedPlan && handlePay(selectedPlan)}
            className="min-w-[250px]"
          >
            {paying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {paying ? '等待支付...' : '立即支付'}
          </Button>

          <p className="text-xs text-muted-foreground mt-2">
            支付完成后系统会自动验证并激活，无需手动操作
          </p>
        </div>
      </div>
    </div>
  )
}
