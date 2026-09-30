import { Booking, TelegramSimulatedMessage } from './types';

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_QM_CHAT_ID = process.env.TELEGRAM_QM_CHAT_ID || '';
export const TELEGRAM_ABBEY_LICENSED_CHAT_ID =
  process.env.TELEGRAM_ABBEY_LICENSED_CHAT_ID || process.env.TELEGRAM_ARTS_CC_CHAT_ID || '';
export const TELEGRAM_ARTS_CC_CHAT_ID = TELEGRAM_ABBEY_LICENSED_CHAT_ID;

/**
 * Format DM sent directly to Quartermaster (@mezyyy)
 */
export function formatQMDMMessage(booking: Booking): string {
  const gear = booking.equipmentNeeds.length > 0 ? booking.equipmentNeeds.join(', ') : 'Standard backline';
  const unlockStatus = booking.needsDoorUnlock
    ? '⚠️ Yes (door-opening message queued for Abbey Licensed 12h prior)'
    : 'No (has door access)';

  return (
    `🎸 *New Abbey Booking*\n\n` +
    `📅 *Date:* ${booking.date}\n` +
    `⏰ *Time:* ${booking.startTime} – ${booking.endTime}\n` +
    `👤 *Booker:* ${booking.residentName} (${booking.telegramHandle})\n` +
    `🏠 *House:* ${booking.tembusuHouse}\n` +
    `👥 *Band / Purpose:* ${booking.bandName} (${booking.purpose})\n` +
    `🔌 *Gear:* ${gear}\n` +
    `🔑 *Needs Unlock:* ${unlockStatus}`
  );
}

/**
 * Format door opening dispatch message for Abbey Licensed Telegram Group (sent 12h before timeslot)
 */
export function formatDoorOpeningMessage(booking: Booking): { text: string; inlineKeyboard: any } {
  const text =
    `🎸 *Abbey Booking — Unlock Needed*\n\n` +
    `📅 *Date:* ${booking.date}\n` +
    `⏰ *Time:* ${booking.startTime} – ${booking.endTime}\n` +
    `👤 *Booker:* ${booking.residentName} (${booking.telegramHandle})\n` +
    `👥 *Band:* ${booking.bandName}\n\n` +
    `Can anyone in hall help unlock the Abbey? Tap below to claim:`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '🔑 I can unlock the Abbey',
          callback_data: `claim_door:${booking.id}`,
        },
      ],
    ],
  };

  return { text, inlineKeyboard };
}

/**
 * Format message when a duty member claims door opening
 */
export function formatDoorClaimedMessage(booking: Booking, claimerHandle: string): string {
  return `✅ *ABBEY DOOR CLAIMED* ✅\n\n` +
    `📅 *Date:* ${booking.date} (${booking.startTime} – ${booking.endTime})\n` +
    `👤 *Booker:* ${booking.residentName} (${booking.telegramHandle})\n` +
    `🔑 *Door Opener:* @${claimerHandle.replace('@', '')} has claimed this duty!\n\n` +
    `_Booker has been notified via Telegram._`;
}

/**
 * Format end-of-session photo check-out reminder for the resident
 */
export function formatCheckoutReminderMessage(booking: Booking): string {
  return `⏳ *ABBEY BOOKING ENDING IN 15 MINS* ⏳\n\n` +
    `Hey ${booking.residentName}, your booking ends at *${booking.endTime}*.\n\n` +
    `*Mandatory Clean-Up Checklist:*\n` +
    `1. Turn off all guitar/bass amps and mixer switches.\n` +
    `2. Coil all XLR & 1/4" jack cables neatly and hang them.\n` +
    `3. Return microphones into the foam mic box.\n` +
    `4. Clear all trash, water bottles, and belongings.\n\n` +
    `📸 *Please reply directly to this message with a photo of the Abbey* to log your check-out!`;
}

/**
 * Dispatch real Telegram message if credentials exist
 */
export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Simulation] Would send to ${chatId}:\n${text}`);
    return { success: false, simulated: true };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    const data = await res.json();
    return { success: data.ok, data };
  } catch (error) {
    console.error('Failed to dispatch Telegram message:', error);
    return { success: false, error };
  }
}
