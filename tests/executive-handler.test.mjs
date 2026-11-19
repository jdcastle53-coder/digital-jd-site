import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createExecutiveHandler } from '../api/_lib/executive-handler.mjs';

function setup(entitled = true) {
  const userId = randomUUID();
  let current, receipt;
  let writes = 0;
  const handler = createExecutiveHandler({
    connect: async () => ({
      authenticate: async () => ({ id: userId }),
      entitled: async () => entitled,
      get: async owner => {
        assert.equal(owner, userId);
        return current;
      },
      request: async (owner, requestId) => {
        assert.equal(owner, userId);
        return receipt?.requestId === requestId ? receipt : null;
      },
      write: async args => {
        assert.equal(args.userId, userId);
        writes++;
        current = { ...args.next, id: args.caseId, version: args.expectedVersion + 1 };
        receipt = { requestId: args.requestId, fingerprint: args.fingerprint, saved_case: current };
        return current;
      }
    })
  });

  async function post(body) {
    const result = {};
    const res = {
      setHeader() {},
      status(code) { result.status = code; return this; },
      json(value) { result.body = value; }
    };
    await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body }, res);
    return result;
  }

  const create = {
    action: 'create', caseId: randomUUID(), requestId: randomUUID(),
    expectedVersion: 0, payload: { title: 'Executive case' }
  };
  return { create, post, writes: () => writes };
}

test('case creation replays the saved response once and rejects reused or stale requests', async () => {
  const { post, create, writes } = setup();
  const first = await post(create);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.version, 1);
  assert.deepEqual(await post(create), first);
  const changed = await post({ ...create, payload: { title: 'Different' } });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.code, 'request_reused');
  const stale = await post({ ...create, requestId: randomUUID() });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'version_conflict');
  assert.equal(writes(), 1);
});

test('accounts without an executive entitlement cannot write cases', async () => {
  const { post, create, writes } = setup(false);
  const result = await post(create);
  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'access_required');
  assert.equal(writes(), 0);
});
