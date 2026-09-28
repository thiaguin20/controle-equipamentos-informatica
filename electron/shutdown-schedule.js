const SHUTDOWN_MINUTE = 18 * 60 + 30;
const WARNING_MINUTE = SHUTDOWN_MINUTE - 5;

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseShutdownTime(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) return SHUTDOWN_MINUTE;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function warningMinutesRemaining(date, shutdownMinute = SHUTDOWN_MINUTE) {
  const minute = minuteOfDay(date);
  if (minute < shutdownMinute - 5 || minute > shutdownMinute) return null;
  return shutdownMinute - minute;
}

function shouldRequestShutdown(date, armedDay, completedDay, shutdownMinute = SHUTDOWN_MINUTE) {
  return minuteOfDay(date) >= shutdownMinute &&
    armedDay === localDayKey(date) &&
    completedDay !== localDayKey(date);
}

module.exports = {
  SHUTDOWN_MINUTE,
  localDayKey,
  minuteOfDay,
  parseShutdownTime,
  warningMinutesRemaining,
  shouldRequestShutdown
};
