import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Handle Callback Query (e.g. Arts CC member taps "I can open the Abbey")
    if (body.callback_query) {
      const { id, data, from, message } = body.callback_query;
      const claimerHandle = from.username ? `@${from.username}` : from.first_name;

      if (data && data.startsWith('claim_door:')) {
        const bookingId = data.replace('claim_door:', '');

        // Respond to Telegram callback query to stop the loading spinner
        if (process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `✅ You have claimed door duty for booking ${bookingId}!`,
            }),
          });

          // Edit original message in group chat to show claimed status
          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n✅ *CLAIMED BY:* ${claimerHandle} (Door Opener)`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        return NextResponse.json({ ok: true, action: 'claimed', bookingId, claimerHandle });
      }
    }

    // 2. Handle Photo Check-Out Reply
    if (body.message?.photo) {
      const chatId = body.message.chat.id;
      const photos = body.message.photo;
      const highestResPhoto = photos[photos.length - 1]; // highest resolution photo file_id

      // Send confirmation to resident
      await sendTelegramMessage(
        String(chatId),
        `📸 *Check-Out Received!*\n\nThank you for uploading the room condition photo. Your check-out has been verified and recorded.\n\nKeep The Abbey jamming! 🎸`
      );

      return NextResponse.json({ ok: true, action: 'checkout_photo_received', fileId: highestResPhoto.file_id });
    }

    // 3. Fallback for /start or generic messages
    if (body.message?.text === '/start') {
      const chatId = body.message.chat.id;
      await sendTelegramMessage(
        String(chatId),
        `👋 *Welcome to Tembusu Abbey Bot!*\n\nI coordinate bandroom door-opening duty for the Arts Committee and handle end-of-session room check-outs.\n\nBook slots online at the Abbey Portal!`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
