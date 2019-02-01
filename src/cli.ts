import {main_client, main_server} from "./main";
import {genLogFilename, wrapConsoleLog} from "./utils/log";

function help(code = 0) {
  let name = 'remote-sync';
  console.log(name, 'v1.0.3');
  console.log('usage:', name, 'server <open-port> <local-path>');
  console.log('usage:', name, 'client <remote-host> <remote-port> <local-path>');
  process.exit(code);
}

export function main() {
  if (process.argv.length < 3) {
    help(0);
  }
  let mode = process.argv[2];
  switch (mode) {
    case 'help':
      help(0);
      break;
    case 'server':
      if (process.argv.length < 5) {
        console.log('Error: missing arguments!');
        help(1);
        break;
      }
      wrapConsoleLog(genLogFilename('server.out'), genLogFilename('server.err'));
      main_server(process.argv[3], process.argv[4]);
      break;
    case 'client':
      if (process.argv.length < 6) {
        console.log('Error: missing arguments!');
        help(1);
        break;
      }
      wrapConsoleLog(genLogFilename('client.out'), genLogFilename('client.err'));
      main_client(process.argv[3], process.argv[4], process.argv[5]);
      break;
    default:
      console.log('Error: invalid mode!');
      help(1);
  }
}
