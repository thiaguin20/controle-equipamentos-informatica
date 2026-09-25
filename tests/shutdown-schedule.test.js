const test = require('node:test');
const assert = require('node:assert/strict');
const {
  localDayKey,
  warningMinutesRemaining,
  shouldRequestShutdown
} = require('../electron/shutdown-schedule');

function at(hour, minute, day = 25) {
  return new Date(2026, 8, day, hour, minute);
}

test('avisa de 18h25 ate 18h30', () => {
  assert.equal(warningMinutesRemaining(at(18, 24)), null);
  assert.equal(warningMinutesRemaining(at(18, 25)), 5);
  assert.equal(warningMinutesRemaining(at(18, 29)), 1);
  assert.equal(warningMinutesRemaining(at(18, 30)), 0);
  assert.equal(warningMinutesRemaining(at(18, 31)), null);
});

test('desliga depois de 18h30 somente se o quiosque ja estava aberto no dia', () => {
  const day = localDayKey(at(18, 29));
  assert.equal(shouldRequestShutdown(at(18, 29), day, null), false);
  assert.equal(shouldRequestShutdown(at(18, 30), day, null), true);
  assert.equal(shouldRequestShutdown(at(19, 0), day, null), true);
  assert.equal(shouldRequestShutdown(at(18, 30), null, null), false);
  assert.equal(shouldRequestShutdown(at(18, 30), day, day), false);
  assert.equal(shouldRequestShutdown(at(18, 30, 26), day, null), false);
});
