import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { EquipmentLoan } from '@/lib/types';
import { INITIAL_EQUIPMENT_LOANS } from '@/lib/store';
import { sendTelegramMessage, formatQMDMMessage, formatQMLoanMessage, TELEGRAM_QM_CHAT_ID } from '@/lib/telegram';

// In-memory fallback if Supabase is not yet connected
let fallbackLoans: EquipmentLoan[] = [...INITIAL_EQUIPMENT_LOANS];

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('equipment_loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const loans: EquipmentLoan[] = data.map((d: any) => ({
          id: d.id,
          requesterName: d.requester_name,
          telegramHandle: d.telegram_handle,
          committee: d.committee || 'Resident',
          purpose: d.purpose,
          eventName: d.purpose,
          basePackage: d.base_package || 'Set A',
          equipmentList: d.equipment_list || [],
          additionalNotes: d.additional_notes || '',
          startDate: d.start_date,
          startTime: d.start_time || '18:00',
          endDate: d.end_date,
          endTime: d.end_time || '22:00',
          agreedToTerms: d.agreed_to_terms ?? true,
          status: d.status || 'pending',
          createdAt: d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        return NextResponse.json({ success: true, source: 'supabase', loans });
      }
    }

    return NextResponse.json({ success: true, source: 'in-memory', loans: fallbackLoans });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      requesterName,
      telegramHandle,
      committee,
      purpose,
      basePackage,
      equipmentList,
      additionalNotes,
      startDate,
      startTime,
      endDate,
      endTime,
      agreedToTerms,
    } = body;

    if (!requesterName || !telegramHandle || !purpose || !startDate) {
      return NextResponse.json({ error: 'Missing required loan fields' }, { status: 400 });
    }

    const cleanHandle = telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`;

    const newLoanObj: EquipmentLoan = {
      id: `loan-${Date.now()}`,
      requesterName,
      telegramHandle: cleanHandle,
      committee: committee || 'Resident',
      purpose,
      eventName: purpose,
      basePackage: basePackage || 'Set A',
      equipmentList: equipmentList || [],
      additionalNotes: additionalNotes || '',
      startDate,
      startTime: startTime || '18:00',
      endDate: endDate || startDate,
      endTime: endTime || '22:00',
      agreedToTerms: Boolean(agreedToTerms),
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('equipment_loans')
        .insert({
          requester_name: requesterName,
          telegram_handle: cleanHandle,
          committee: committee || 'Resident',
          purpose,
          base_package: basePackage || 'Set A',
          additional_notes: additionalNotes || null,
          start_date: startDate,
          start_time: startTime || '18:00',
          end_date: endDate || startDate,
          end_time: endTime || '22:00',
          equipment_list: equipmentList || [],
          agreed_to_terms: Boolean(agreedToTerms),
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        newLoanObj.id = data.id;
      }
    } else {
      fallbackLoans = [newLoanObj, ...fallbackLoans];
    }

    // Direct Telegram DM to QM if bot token is active
    if (TELEGRAM_QM_CHAT_ID) {
      const qmMsg = formatQMLoanMessage(newLoanObj);
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '✅ Approve Loan', callback_data: `approve_loan:${newLoanObj.id}` },
            { text: '❌ Reject', callback_data: `reject_loan:${newLoanObj.id}` },
          ],
        ],
      };
      await sendTelegramMessage(TELEGRAM_QM_CHAT_ID, qmMsg, replyMarkup);
    }

    return NextResponse.json({ success: true, loan: newLoanObj });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit loan' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing loan ID or status' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('equipment_loans')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    } else {
      fallbackLoans = fallbackLoans.map((l) => (l.id === id ? { ...l, status } : l));
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update loan status' }, { status: 500 });
  }
}
