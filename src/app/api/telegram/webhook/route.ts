import { NextResponse } from 'next/server';
import { sendTelegramMessage, TELEGRAM_BOT_TOKEN, TELEGRAM_QM_CHAT_ID, TELEGRAM_ABBEY_LICENSED_CHAT_ID } from '@/lib/telegram';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Handle Interactive Callback Queries (Approve / Reject / Claim Door)
    if (body.callback_query) {
      const { id, data, from, message } = body.callback_query;
      const userHandle = from.username ? `@${from.username}` : from.first_name;

      // --- A. Claim Door Duty by Abbey Licensed member ---
      if (data && data.startsWith('claim_door:')) {
        const bookingId = data.replace('claim_door:', '');

        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `✅ Thank you ${userHandle}! You have claimed door duty for this slot.`,
            }),
          });

          // Update message in group chat
          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n✅ *DOOR DUTY CLAIMED:* ${userHandle} will unlock the Abbey.`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        // Update database
        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('bookings')
            .update({
              door_opener_handle: userHandle,
              door_claimed_at: new Date().toISOString(),
            })
            .eq('id', bookingId);
        }

        return NextResponse.json({ ok: true, action: 'claimed_door', bookingId, userHandle });
      }

      // --- B. QM Approves Bandroom Booking ---
      if (data && data.startsWith('approve_booking:')) {
        const bookingId = data.replace('approve_booking:', '');

        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `✅ Approved booking ${bookingId}! Added to calendar.`,
            }),
          });

          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n✅ *STATUS:* APPROVED by Quartermaster (@mezyyy)`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        // Update booking in Supabase
        let bookingData: any = null;
        if (isSupabaseConfigured && supabase) {
          const { data: updated } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId)
            .select()
            .single();
          bookingData = updated;
        }

        // If door unlock is requested, dispatch to Abbey Licensed group
        if (bookingData && bookingData.needs_door_unlock && TELEGRAM_ABBEY_LICENSED_CHAT_ID) {
          const doorMsg =
            `🎸 *Abbey Booking — Unlock Needed*\n\n` +
            `📅 *Date:* ${bookingData.date}\n` +
            `⏰ *Time:* ${bookingData.start_time} – ${bookingData.end_time}\n` +
            `👤 *Booker:* ${bookingData.resident_name} (${bookingData.telegram_handle})\n` +
            `🎯 *Purpose:* ${bookingData.purpose || 'Band Practice'}\n\n` +
            `Can anyone in hall help unlock the Abbey? Tap below to claim:`;

          const replyMarkup = {
            inline_keyboard: [
              [
                {
                  text: '🔑 I can unlock the Abbey',
                  callback_data: `claim_door:${bookingId}`,
                },
              ],
            ],
          };

          await sendTelegramMessage(TELEGRAM_ABBEY_LICENSED_CHAT_ID, doorMsg, replyMarkup);
        }

        return NextResponse.json({ ok: true, action: 'booking_approved', bookingId });
      }

      // --- C. QM Rejects Bandroom Booking ---
      if (data && data.startsWith('reject_booking:')) {
        const bookingId = data.replace('reject_booking:', '');

        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `❌ Rejected booking ${bookingId}.`,
            }),
          });

          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n❌ *STATUS:* REJECTED by Quartermaster (@mezyyy)`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);
        }

        return NextResponse.json({ ok: true, action: 'booking_rejected', bookingId });
      }

      // --- D. QM Approves Equipment Loan ---
      if (data && data.startsWith('approve_loan:')) {
        const loanId = data.replace('approve_loan:', '');

        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `✅ Approved equipment loan!`,
            }),
          });

          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n✅ *STATUS:* APPROVED by Quartermaster (@mezyyy)`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('equipment_loans')
            .update({ status: 'approved' })
            .eq('id', loanId);
        }

        return NextResponse.json({ ok: true, action: 'loan_approved', loanId });
      }

      // --- E. QM Rejects Equipment Loan ---
      if (data && data.startsWith('reject_loan:')) {
        const loanId = data.replace('reject_loan:', '');

        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: id,
              text: `❌ Rejected equipment loan.`,
            }),
          });

          if (message?.chat?.id && message?.message_id) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: `${message.text}\n\n❌ *STATUS:* REJECTED by Quartermaster (@mezyyy)`,
                parse_mode: 'Markdown',
              }),
            });
          }
        }

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('equipment_loans')
            .update({ status: 'rejected' })
            .eq('id', loanId);
        }

        return NextResponse.json({ ok: true, action: 'loan_rejected', loanId });
      }
    }

    // 2. Handle Photo Check-Out Reply from Resident
    if (body.message?.photo) {
      const chatId = body.message.chat.id;
      const photos = body.message.photo;
      const highestResPhoto = photos[photos.length - 1]; // highest resolution photo file_id
      const senderHandle = body.message.from?.username
        ? `@${body.message.from.username}`
        : body.message.from?.first_name || 'Resident';

      // Send thank you confirmation to resident
      await sendTelegramMessage(
        String(chatId),
        `📸 *Check-Out Received! Thank you!*\n\nYour Abbey room check-out photo has been received and added to the Tech check-out photo database.\n\nKeep jamming! 🎸`
      );

      // Forward / alert QM
      if (TELEGRAM_QM_CHAT_ID && String(chatId) !== TELEGRAM_QM_CHAT_ID) {
        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_QM_CHAT_ID,
              photo: highestResPhoto.file_id,
              caption: `📸 *Abbey Room Check-Out Photo*\nFrom: ${senderHandle}\nTime: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              parse_mode: 'Markdown',
            }),
          });
        }
      }

      return NextResponse.json({
        ok: true,
        action: 'checkout_photo_received',
        sender: senderHandle,
        fileId: highestResPhoto.file_id,
      });
    }

    // 3. Fallback for /start or generic messages
    if (body.message?.text === '/start') {
      const chatId = body.message.chat.id;
      await sendTelegramMessage(
        String(chatId),
        `👋 *Welcome to Tembusu Abbey Bot!*\n\nI handle Abbey bandroom booking requests, door-opening alerts, and session room check-out photo verification.\n\nBook your slot or loan equipment online at the Abbey Portal!`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
