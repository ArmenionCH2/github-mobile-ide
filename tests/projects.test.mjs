import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProjects, saveProjects } from '../src/projects.ts';

test('projects survive a fresh read and are isolated per account', () => {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  } });
  assert.deepEqual(loadProjects('FirstAccount'), []);
  const projects = [{ id: 'p1', name: 'School', repositories: [
    { id: 42, name: 'firstaccount/app' },
    { id: 71, name: 'school-org/service' },
  ] }];
  saveProjects('FirstAccount', projects);
  assert.deepEqual(loadProjects('firstaccount'), projects);
  assert.deepEqual(loadProjects('OtherAccount'), []);
  saveProjects('OtherAccount', [{ id: 'p2', name: 'Personal', repositories: [] }]);
  saveProjects('FirstAccount', []);
  assert.deepEqual(loadProjects('FirstAccount'), []);
  assert.equal(loadProjects('OtherAccount')[0].name, 'Personal');
});

test('invalid storage is reported without silently replacing it', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => '{"unexpected":true}',
  } });
  assert.throws(() => loadProjects('account'), /Invalid project list/);
});
