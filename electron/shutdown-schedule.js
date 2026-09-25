const SHUTDOWN_MINUTE = 18 * 60 + 30;
const WARNING_MINUTE = SHUTDOWN_MINUTE - 5;

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function warningMinutesRemaining(date) {
  const minute = minuteOfDay(date);
  if (minute < WARNING_MINUTE || minute > SHUTDOWN_MINUTE) return null;
  return SHUTDOWN_MINUTE - minute;
}

function shouldRequestShutdown(date, armedDay, completedDay) {
  return minuteOfDay(date) >= SHUTDOWN_MINUTE &&
    armedDay === localDayKey(date) &&
    completedDay !== localDayKey(date);
}

module.exports = {
  SHUTDOWN_MINUTE,
  localDayKey,
  minuteOfDay,
  warningMinutesRemaining,
  shouldRequestShutdown
};
