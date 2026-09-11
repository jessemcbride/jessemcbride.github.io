import test from 'node:test';
import assert from 'node:assert/strict';
import { bankItems, filterItems, bankGrid } from '../public/bank-view.js';
const items = [{ id: 23760, name: 'Smolcano', count: 1 }, { id: 11920, name: 'Dragon pickaxe', count: 2 }, { id: 1, name: 'Other find', count: 9 }];
test('Bank filters combine search, tabs and sorting without changing source data', () => {
  assert.deepEqual(filterItems(items, 'DRAGON', 'keepsakes').map(i => i.id), [11920]);
  assert.deepEqual(filterItems(items, '', 'recent', 'name', [items[0]]).map(i => i.id), [23760]);
  assert.deepEqual(filterItems(items, '', 'all', 'quantity').map(i => i.count), [9, 2, 1]);
  assert.equal(items[0].id, 23760);
  assert.equal(filterItems(items, 'missing').length, 0);
});
test('Bank displays only the correct synced account and retains safe wiki links without JavaScript', () => {
  const log = { username: 'Nonduality', availability: 'synced', items };
  assert.deepEqual(bankItems(log, 'Other'), []);
  assert.equal(bankItems(log, 'Nonduality').length, 3);
  assert.match(bankGrid(items), /data-item="23760"/);
  assert.match(bankGrid([{ id: 1, name: '<bad>', count: 1 }]), /&lt;bad&gt;/);
});
