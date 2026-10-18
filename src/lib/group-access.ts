type GroupUser = { id: number; first_name: string; username?: string };
type License = { name: string; active: boolean };

export class GroupAccessError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// Never cache membership: leaving or being removed takes effect on the next request.
export async function isGroupMember(userId: number, chatId: string, token: string, request: typeof fetch = fetch) {
  try {
    if (!token || !/^-\d+$/.test(chatId)) throw new Error('Missing group configuration');
    const response = await request(`https://api.telegram.org/bot${token}/getChatMember`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
      signal: AbortSignal.timeout(10000), cache: 'no-store',
    });
    const result = await response.json();
    const member = result.result;
    if (!response.ok || !result.ok || member?.user?.id !== userId || typeof member.status !== 'string') throw new Error('Membership unavailable');
    if (['creator', 'administrator', 'member'].includes(member.status)) return true;
    if (member.status === 'restricted') return member.is_member === true;
    if (['left', 'kicked'].includes(member.status)) return false;
    throw new Error('Unknown membership status');
  } catch {
    // Do not expose Telegram request URLs, which contain the bot token.
    throw new GroupAccessError('Unable to verify Abbey Licensed membership. Please try again or contact the quartermaster.', 503);
  }
}

export async function groupLicense(user: GroupUser, registry: {
  member: () => Promise<boolean>;
  claim: () => Promise<License | null>;
  bound: () => Promise<License | null>;
  revokedHandle: () => Promise<boolean>;
  create: (row: { handle: string; name: string; telegram_user_id: number; active: boolean }) => Promise<void>;
}) {
  if (!await registry.member()) throw new GroupAccessError('Access is for members of Abbey Licensed ’26/27. Contact the quartermaster to join the group.', 403);
  let license = await registry.claim();
  if (!license) {
    license = await registry.bound();
    if (!license) {
      if (await registry.revokedHandle()) throw new GroupAccessError('Your Abbey access has been revoked. Contact the quartermaster.', 403);
      // A stable, reserved identifier also supports members without a username.
      // Insert only: a concurrent request must never reactivate a revoked row.
      await registry.create({ handle: `telegram:${user.id}`, name: user.first_name, telegram_user_id: user.id, active: true });
      license = await registry.bound();
    }
  }
  if (!license) throw new GroupAccessError('The licensing registry is unavailable. Please try again.', 503);
  if (!license.active) throw new GroupAccessError('Your Abbey access has been revoked. Contact the quartermaster.', 403);
  return license;
}
