import { createHash } from 'node:crypto'
import { createLogger } from './logger'

const PID = '52442152'
const KEY = 'Y57iq6vZFIAEF7JuBEOyBdpZrqVTI5qgPnBf9RsxHQm56syeOgLC194iuloZLzBR'
const API_URL = 'https://pay.qianqiu.fun'
const ECS_HOST = 'http://139.224.244.62:3456'

const logger = createLogger('payment')

function generateSign(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).filter(k => k !== 'sign' && k !== 'sign_type').sort()
  const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + KEY
  return createHash('md5').update(signStr).digest('hex')
}

export async function createOrder(
  name: string,
  money: string,
  planId?: string,
): Promise<{ code: number; msg?: string; trade_no?: string; payurl?: string; qrcode?: string }> {
  const outTradeNo = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  const notifyUrl = `${ECS_HOST}/pay/notify`

  const params: Record<string, string> = {
    pid: PID,
    type: 'alipay',
    out_trade_no: outTradeNo,
    name,
    money,
    device: 'pc',
    notify_url: notifyUrl,
    param: planId || 'monthly',
  }

  params.sign = generateSign(params)
  params.sign_type = 'MD5'

  logger.info(`创建订单: out_trade_no=${outTradeNo}, name=${name}, money=${money}, notify_url=${notifyUrl}`)

  const body = new URLSearchParams(params).toString()
  const resp = await fetch(`${API_URL}/mapi.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const result = await resp.json()
  logger.info(`创建订单结果: ${JSON.stringify(result)}`)
  return result
}

export async function queryOrder(tradeNo: string): Promise<{ paid: boolean; planId?: string }> {
  try {
    const resp = await fetch(`${ECS_HOST}/check?trade_no=${tradeNo}`)
    return await resp.json()
  } catch {
    return { paid: false }
  }
}
