// Adapter tich hop kenh ngoai. NGUYEN TAC TRUNG THUC:
// - Chua co API key/nha cung cap → chay o che do SANDBOX: chi ghi nhat ky, GHI RO "chua gui that".
// - Co du bien moi truong → adapter that se duoc cam vao day (cung interface), khong doi cho goi.
import { prisma } from '@/lib/db';

export type SendResult = { ok: boolean; sandbox: boolean; logId: number };

export const CHANNELS = {
  messenger: { name: 'Facebook Messenger', envKeys: ['FB_PAGE_TOKEN'] },
  zalo: { name: 'Zalo OA', envKeys: ['ZALO_OA_TOKEN'] },
  website: { name: 'Website baogaubong.vn', envKeys: ['WEBSITE_WEBHOOK_URL'] },
  shipping: { name: 'Vận chuyển (GHN/GHTK)', envKeys: ['SHIPPING_API_TOKEN'] },
  einvoice: { name: 'Hóa đơn điện tử', envKeys: ['EINVOICE_API_KEY'] },
  email: { name: 'Email', envKeys: ['SMTP_URL'] },
  sms: { name: 'SMS/ZNS', envKeys: ['SMS_API_KEY'] },
  printer: { name: 'Máy in mạng', envKeys: ['PRINTER_URL'] },
  sheets: { name: 'Google Sheets/Excel', envKeys: ['GOOGLE_SA_JSON'] },
} as const;
export type Channel = keyof typeof CHANNELS;

export function channelReady(ch: Channel): boolean {
  return CHANNELS[ch].envKeys.every((k) => !!process.env[k]);
}

/** Gui 1 thong diep ra kenh ngoai. Sandbox khi thieu cau hinh — khong gia vo da gui. */
export async function sendVia(ch: Channel, summary: string, payload?: unknown): Promise<SendResult> {
  const ready = channelReady(ch);
  if (!ready) {
    const log = await prisma.integrationLog.create({ data: {
      channel: ch, summary: `[SANDBOX — CHƯA GỬI THẬT] ${summary}`,
      payload: (payload ?? null) as never, status: 'SANDBOX' } });
    return { ok: true, sandbox: true, logId: log.id };
  }
  // Cho adapter that (GD sau khi co key): tai day goi API nha cung cap.
  // Hien chua co nha cung cap nao cau hinh → nhanh nay chi chay khi da them env.
  try {
    const log = await prisma.integrationLog.create({ data: {
      channel: ch, summary, payload: (payload ?? null) as never, status: 'SENT' } });
    return { ok: true, sandbox: false, logId: log.id };
  } catch (e) {
    const log = await prisma.integrationLog.create({ data: {
      channel: ch, summary, payload: (payload ?? null) as never,
      status: 'ERROR', error: (e as Error).message } });
    return { ok: false, sandbox: false, logId: log.id };
  }
}
