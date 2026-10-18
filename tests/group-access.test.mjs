import test from 'node:test';
import assert from 'node:assert/strict';
import { groupLicense, isGroupMember } from '../src/lib/group-access.ts';

const user = { id: 123, first_name: 'Alex' };
const active = { name: 'Alex', active: true };
const response = (result, ok = true) => new Response(JSON.stringify({ ok, result }), { status: ok ? 200 : 400 });

test('Telegram membership accepts current members and denies departed members', async () => {
  for (const [status, is_member, expected] of [
    ['creator', undefined, true], ['administrator', undefined, true], ['member', undefined, true],
    ['restricted', true, true], ['restricted', false, false], ['left', undefined, false], ['kicked', undefined, false],
  ]) {
    const member = await isGroupMember(123, '-100123', 'test-token', async (url, options) => {
      assert.ok(url.endsWith('/getChatMember'));
      assert.deepEqual(JSON.parse(options.body), { chat_id: '-100123', user_id: 123 });
      assert.equal(options.cache, 'no-store');
      return response({ user: { id: 123 }, status, is_member });
    });
    assert.equal(member, expected, status);
  }
});

test('membership fails closed on outages, malformed responses and mismatched identities without leaking credentials', async () => {
  for (const request of [
    async () => { throw new Error('https://api.telegram.org/botsecret-token/getChatMember'); },
    async () => response(null, false),
    async () => new Response('not json'),
    async () => response({ status: 'member', user: { id: 456 } }),
    async () => response({ status: 'unknown', user: { id: 123 } }),
  ]) {
    await assert.rejects(isGroupMember(123, '-100123', 'secret-token', request), error => error.status === 503 && !error.message.includes('secret-token'));
  }
});

test('group members without usernames are registered once without overwriting concurrent revocations', async () => {
  let row = null, inserts = 0;
  const registry = {
    member: async () => true, claim: async () => null, bound: async () => row,
    revokedHandle: async () => false,
    create: async value => { inserts++; assert.equal(value.handle, 'telegram:123'); row ??= value; },
  };
  assert.equal((await groupLicense(user, registry)).active, true);
  await groupLicense(user, registry);
  assert.equal(inserts, 1);
  row.active = false;
  await assert.rejects(groupLicense(user, registry), error => error.status === 403);
  assert.equal(inserts, 1);
  // Simulate revocation being committed between the initial lookup and insert.
  row = null;
  registry.create = async () => { row = { ...active, active: false }; };
  await assert.rejects(groupLicense(user, registry), error => error.status === 403);
});

test('group membership is checked again even when the account has an active registry entry', async () => {
  let member = true, claims = 0;
  const registry = {
    member: async () => member, claim: async () => { claims++; return active; },
    bound: async () => active, revokedHandle: async () => false,
    create: async () => assert.fail('existing license must not be recreated'),
  };
  assert.equal(await groupLicense(user, registry), active);
  member = false;
  await assert.rejects(groupLicense(user, registry), error => error.status === 403);
  assert.equal(claims, 1);
});

test('a revoked unbound username cannot gain access through automatic registration', async () => {
  await assert.rejects(groupLicense({ ...user, username: 'alex_test' }, {
    member: async () => true, claim: async () => null, bound: async () => null,
    revokedHandle: async () => true, create: async () => assert.fail('must not restore revoked access'),
  }), error => error.status === 403);
});
