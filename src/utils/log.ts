/**
 * copied from @beenotung/tslib/src/log.ts
 * */

function to2Dig(n: number) {
  if (n < 10) {
    return '0' + n;
  }
  return n.toString();
}

export function genLogFilename(name = 'log', ext = 'txt') {
  const d = new Date();
  const dateText = [
    d.getFullYear(),
    to2Dig(d.getMonth() + 1),
    to2Dig(d.getDate()),
    '-',
    to2Dig(d.getHours()),
    to2Dig(d.getMinutes()),
    to2Dig(d.getSeconds()),
  ].join('');
  return [name, dateText, ext].join('.');
}

export function wrapConsoleLog(logFilename = genLogFilename(), errorFilename = logFilename) {
  const fs = require('fs');
  const util = require('util');
  const logFile = fs.createWriteStream(logFilename, {flags: 'a'});
  const errorFile = (logFilename === errorFilename) ? logFile : fs.createWriteStream(errorFilename, {flags: 'a'});
  // Or 'w' to truncate the file every time the process starts.
  const logStdout = process.stdout;
  const logStderr = process.stderr;

  console.log = function () {
    let chunk = util.format.apply(null, arguments) + '\n';
    logFile.write(chunk);
    logStdout.write(chunk);
  };
  // console.error = console.log;
  console.error = function () {
    let chunk = util.format.apply(null, arguments) + '\n';
    errorFile.write(chunk);
    logStderr.write(chunk);
  };
}
