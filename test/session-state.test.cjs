const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession, restoreActiveSession, snapshotSession, completeSession, setSessionPaused } = require('../src/session-state.js');

test('creates a clean local session record with the required interview context', () => {
  const session = createSession({ company: '  Acme  ', jobDescription: '  Engineer role  ', model: 'qwen3.5:4b', language: 'hi', type: 'Interview', contextIds: ['resume-1', 'doc-1', 'resume-1', 42], saveTranscript: false, autoGenerate: true, now: 1_800_000_000_000 });
  assert.equal(session.company, 'Acme');
  assert.equal(session.jobDescription, 'Engineer role');
  assert.equal(session.model, 'qwen3.5:4b');
  assert.equal(session.type, 'Interview');
  assert.equal(session.language, 'hi');
  assert.equal(session.saveTranscript, false);
  assert.equal(session.autoGenerate, true);
  assert.deepEqual(session.contextIds, ['resume-1', 'doc-1']);
  assert.equal(session.status, 'active');
  assert.deepEqual(session.messages, []);
  assert.equal(session.elapsedSeconds, 0);
  assert.equal(session.startedAt, new Date(1_800_000_000_000).toISOString());
});

test('recovers active sessions as interrupted and sanitizes persisted message records', () => {
  const restored = restoreActiveSession(JSON.stringify({
    id: 'session-1', status: 'active', elapsedSeconds: '61',
    messages: [{ text: 'Question', source: 'Interviewer' }, { text: 42 }, null]
  }));
  assert.equal(restored.status, 'interrupted');
  assert.equal(restored.elapsedSeconds, 61);
  assert.equal(restored.language, 'en');
  assert.equal(restored.type, 'Mock interview');
  assert.deepEqual(restored.contextIds, []);
  assert.equal(restored.saveTranscript, true);
  assert.equal(restored.autoGenerate, false);
  assert.deepEqual(restored.messages, [{ text: 'Question', source: 'Interviewer' }]);
  assert.equal(restoreActiveSession('{bad json'), null);
  assert.equal(restoreActiveSession({ id: 'done', status: 'completed', messages: [] }), null);
});

test('keeps only safe session types and bounded unique local context references', () => {
  const session = createSession({ company: 'Acme', jobDescription: 'Role', type: 'Injected type', contextIds: ['a', 'a', '', 'x'.repeat(181)] });
  assert.equal(session.type, 'Mock interview');
  assert.deepEqual(session.contextIds, ['a']);
});

test('normalizes saved session language codes', () => {
  const session = createSession({ company: 'Acme', jobDescription: 'Role', language: 'xx<script>' });
  assert.equal(session.language, 'en');
  const restored = restoreActiveSession({ id: 'session-language', status: 'active', language: 'FR', messages: [] });
  assert.equal(restored.language, 'fr');
});

test('restores opt-in answer suggestion preference without enabling it by default', () => {
  const optedIn = restoreActiveSession({ id: 'session-auto', status: 'active', autoGenerate: true, messages: [] });
  const defaultOff = restoreActiveSession({ id: 'session-default', status: 'active', messages: [] });
  assert.equal(optedIn.autoGenerate, true);
  assert.equal(defaultOff.autoGenerate, false);
});

test('pause state is explicit, survives persistence, and clears on recovery or completion', () => {
  const session = createSession({ company: 'Acme', jobDescription: 'Role' });
  const paused = setSessionPaused(session, true);
  assert.equal(paused.paused, true);
  assert.equal(snapshotSession(paused, [], 12).paused, true);
  assert.equal(restoreActiveSession(snapshotSession(paused, [], 12)).paused, false);
  assert.equal(setSessionPaused({ ...session, status: 'completed' }, true).paused, false);
  assert.equal(completeSession(paused, [], 12).paused, false);
});

test('snapshots transcript state and marks disconnect as completed', () => {
  const session = createSession({ company: 'Acme', jobDescription: 'Engineer', now: 1_800_000_000_000 });
  const messages = [{ text: 'Tell me about a project.', source: 'Interviewer · now' }, { text: 'I led a migration.', source: 'You · now' }];
  const snapshot = snapshotSession(session, messages, 47);
  assert.equal(snapshot.status, 'active');
  assert.equal(snapshot.elapsedSeconds, 47);
  assert.equal(snapshot.messages.length, 2);
  const completed = completeSession(session, messages, 47, '2026-10-20T00:00:00.000Z');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.endedAt, '2026-10-20T00:00:00.000Z');
  assert.equal(completed.messages[1].text, 'I led a migration.');
});

test('never stores message text when transcript saving is disabled', () => {
  const session = createSession({ company: 'Acme', jobDescription: 'Role', saveTranscript: false });
  const snapshot = snapshotSession(session, [{ text: 'Sensitive answer', source: 'You' }], 4);
  assert.deepEqual(snapshot.messages, []);
  assert.deepEqual(completeSession(session, [{ text: 'Sensitive answer', source: 'You' }], 4).messages, []);
});
