import { applyCommand } from './executive-case-core.mjs';

export function createEvaluationStore(storage, userId, makeId = () => crypto.randomUUID()) {
  const key = 'digital-jd:executive-evaluation:' + userId;
  function read() {
    const raw = storage.getItem(key);
    const records = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(records)) throw new Error('The saved evaluation cases could not be opened.');
    return records;
  }

  return {
    list() {
      return read().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    get(id) {
      const record = read().find(entry => entry.id === id);
      if (!record) throw new Error('This evaluation case was not found.');
      return record;
    },
    write({ caseId, expectedVersion, action, payload }) {
      const records = read();
      const index = records.findIndex(entry => entry.id === caseId);
      const previous = records[index] || null;
      if ((previous?.version || 0) !== expectedVersion) {
        throw new Error('This case has changed. Open it again before saving.');
      }
      const now = new Date().toISOString();
      const next = {
        ...applyCommand(previous, action, payload, { id: makeId(), now }),
        id: caseId,
        version: expectedVersion + 1,
        created_at: previous?.created_at || now,
        updated_at: now,
      };
      if (index < 0) records.push(next);
      else records[index] = next;
      storage.setItem(key, JSON.stringify(records));
      return next;
    },
  };
}
