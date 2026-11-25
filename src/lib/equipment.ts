export type EquipmentRole = 'owner' | 'tech' | 'member';
export type Asset = { id: string; asset_tag: string; serial_number: string | null; condition: string; whereabouts: string; notes?: string | null };
export type Equipment = {
  id: string; item_code: string; name: string; category: string | null; subtype: string | null; unit: string | null;
  tracking_mode: string | null; verification_status: string; loanable: boolean; photo_path: string | null; notes: string | null;
  working: number; limited: number; faulty: number; untested: number; out: number; available: number | null; assets: Asset[];
};
export type LoanMovement = { id: string; asset_id: string | null; movement_type: string; quantity: number; condition: string; occurred_at: string; actor_telegram_id: number; notes: string | null; actor_label?: string; asset_tag?: string | null };
export type LoanLine = { id: string; item_id: string; requested_qty: number; approved_qty: number | null; abbey_inventory_items: { name: string; unit: string; tracking_mode: string }; abbey_loan_movements: LoanMovement[] };
export type EquipmentLoan = { id: string; borrower_name: string; borrower_handle: string | null; borrower_telegram_id: number; purpose: string; committee: string; starts_at: string; due_at: string; status: string; notes: string | null; abbey_loan_items: LoanLine[] };
export const LOAN_TERMS_VERSION = 'abbey-loan-2026-11';
export const LOAN_TERMS = 'Any damages caused to equipment shall be borne by the loaner, and the extent of damage will be calculated at the current price of the equipment. The loaner will make every effort to ensure the safety of the equipment, and will follow approved procedures of handling the equipment. If found to be misusing the equipment or engaging in harmful or dangerous practices, the loaner assumes full responsibility. The Arts Council reserves the right to withdraw equipment from the loaner in such an event. Late returns may incur a fee.';
export const equipmentStaff = (role: EquipmentRole) => role === 'owner' || role === 'tech';
export const outstanding = (line: LoanLine) => line.abbey_loan_movements.reduce((sum,m) => sum + (m.movement_type === 'checkout' ? m.quantity : -m.quantity),0);
export const collected = (line: LoanLine) => line.abbey_loan_movements.filter(m=>m.movement_type==='checkout').reduce((sum,m)=>sum+m.quantity,0);
export const loanOutstanding = (loan: EquipmentLoan) => loan.abbey_loan_items.reduce((sum,line)=>sum+outstanding(line),0);
export const overdue = (loan: EquipmentLoan, now = Date.now()) => loanOutstanding(loan)>0 && Date.parse(loan.due_at)<now;
export function loanDates(start: unknown,end: unknown, now=Date.now()) {
  const starts_at=new Date(String(start)), due_at=new Date(String(end));
  if (!Number.isFinite(starts_at.getTime()) || !Number.isFinite(due_at.getTime()) || starts_at.getTime()<now+7*86400000 || starts_at.getTime()>now+366*86400000 || due_at<=starts_at || due_at.getTime()-starts_at.getTime()>72*3600000) throw new Error('Choose collection at least 7 days ahead, within the next year, and return within 3 days.');
  return { starts_at:starts_at.toISOString(), due_at:due_at.toISOString() };
}
