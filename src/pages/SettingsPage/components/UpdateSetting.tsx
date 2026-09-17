import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePaymentStore, PLANS } from '@/hooks/usePaymentStore'
import { version } from '../../../../package.json'

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms)) return '永久'
  if (ms <= 0) return '已过期'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}天${hours}小时`
  return `${hours}小时`
}

export function UpdateSetting() {
  const { licensed, planId, getRemainingMs, firstLaunchAt } = usePaymentStore()
  const remaining = getRemainingMs()
  const plan = PLANS.find(p => p.id === planId)

  return (
    <Card id="update-section">
      <CardHeader>
        <CardTitle>软件版本</CardTitle>
        <CardDescription>当前应用程序版本信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">当前版本</h4>
            <p className="text-sm text-muted-foreground">{version}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">授权状态</h4>
            <p className="text-sm text-muted-foreground">
              {licensed
                ? `已激活 - ${plan?.name || '会员'}`
                : `试用中 - 剩余 ${formatRemaining(remaining)}`}
            </p>
          </div>
          <Badge variant={licensed ? 'default' : 'secondary'}>
            {licensed ? '已激活' : '试用版'}
          </Badge>
        </div>

        {!licensed && firstLaunchAt && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">试用开始时间</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(firstLaunchAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
