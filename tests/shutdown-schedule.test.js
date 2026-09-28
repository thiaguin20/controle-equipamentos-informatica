const test = require('node:test');
const assert = require('node:assert/strict');
const {
  localDayKey,
  parseShutdownTime,
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

test('horario configuravel altera aviso e desligamento',()=>{
  const minute=parseShutdownTime('17:45');
  const day=localDayKey(at(17,44));
  assert.equal(minute,17*60+45);
  assert.equal(warningMinutesRemaining(at(17,40),minute),5);
  assert.equal(warningMinutesRemaining(at(17,44),minute),1);
  assert.equal(shouldRequestShutdown(at(17,44),day,null,minute),false);
  assert.equal(shouldRequestShutdown(at(17,45),day,null,minute),true);
  assert.equal(parseShutdownTime('25:99'),18*60+30);
});
