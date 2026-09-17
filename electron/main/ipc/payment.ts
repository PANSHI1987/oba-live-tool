import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createOrder, queryOrder } from '#/payment'
import { typedIpcMainHandle } from '#/utils'

export function setupPaymentIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.payment.createOrder, async (_, params: { name: string; money: string; planId?: string }) => {
    return createOrder(params.name, params.money, params.planId)
  })

  typedIpcMainHandle(IPC_CHANNELS.payment.queryOrder, async (_, tradeNo: string) => {
    return queryOrder(tradeNo)
  })
}
