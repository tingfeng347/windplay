const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

// A deterministic player uses only normal actions. This catches campaign-level
// dead ends and balance regressions that isolated combat tests cannot detect.
function route(state, target) {
  const queue = [{ x: state.player.x, y: state.player.y, first: null, distance: 0 }];
  const seen = new Set([C.pos(state.player.x, state.player.y)]);
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.x === target.x && node.y === target.y) return node;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = node.x + dx, y = node.y + dy, key = C.pos(x, y);
      if (!C.walkable(state, x, y) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, first: node.first || { type: 'move', dx, dy }, distance: node.distance + 1 });
    }
  }
  return null;
}

for (const role of Object.keys(C.ROLES)) {
  test(`${role} can complete all five floors through legal actions, including a mid-run save reload`, () => {
    let state = C.newGame('test0', role);
    let reloaded = false;
    const floors = new Set([state.floor]);
    for (let turn = 0; turn < 1500 && state.status === 'playing'; turn++) {
      const p = state.player;
      const adjacent = state.enemies.filter(e => Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 1);
      let action;
      if (p.hp <= p.maxHp - 19 && p.potions > 0) action = { type: 'heal' };
      else if (adjacent.length > 1 && p.charges > 0) action = { type: 'pulse' };
      else if (adjacent.length) {
        const enemy = adjacent.sort((a, b) => a.hp - b.hp)[0];
        action = { type: 'move', dx: enemy.x - p.x, dy: enemy.y - p.y };
      } else if (p.x === state.exit.x && p.y === state.exit.y && p.key) {
        action = { type: 'interact' };
      } else {
        const targets = state.items.filter(item => ['weapon', 'armor', 'key', 'potion'].includes(item.type));
        if (state.floor === 5) targets.push(...state.enemies.filter(e => e.boss));
        if (p.key) targets.push(state.exit);
        const choices = targets.map(target => route(state, target)).filter(r => r?.distance > 0);
        choices.sort((a, b) => a.distance - b.distance);
        assert.ok(choices.length, 'At least one campaign objective remains reachable.');
        action = choices[0].first;
      }
      assert.equal(C.step(state, action), true);
      floors.add(state.floor);
      if (state.floor === 3 && !reloaded) {
        state = C.restore(C.serialize(state));
        assert.ok(state, 'A live campaign save must restore.');
        reloaded = true;
      }
    }
    assert.equal(reloaded, true);
    assert.equal(state.status, 'won');
    assert.equal(floors.size, 5);
    assert.equal(state.enemies.some(e => e.boss), false);
    assert.ok(state.kills > 20);
    assert.ok(state.player.level > 1);
  });
}
