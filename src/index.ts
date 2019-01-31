import {SyncScanner} from "./sync-scanner";
import {SyncFile} from "./model";
import {correctFilepath, totalSize} from "./utils";
import {formatFloat} from "./format";
import {inspect} from "util";

function checkCrc32Collision(scanner: SyncScanner) {
  scanner.crc32Map.forEach((crc32Files, crc32) => {
    crc32Files = crc32Files.filter(file => file.sha256Hex);
    if (crc32Files.length > 1) {
      let hs = new Map<string, SyncFile[]>();
      crc32Files.forEach(file => {
        if (hs.has(file.sha256Hex)) {
          hs.get(file.sha256Hex).push(file)
        } else {
          hs.set(file.sha256Hex, [file])
        }
      });
      hs.forEach((sha256Files, sha256) => {
        if (sha256Files.length !== crc32Files.length) {
          scanner.log(crc32Files.length, 'files of diff sha256 but same crc32');
          scanner.log(inspect({crc32Files, sha256Files}, {depth: 99}))
        }
      });
    }
  });
}

let filepath = correctFilepath(process.argv[2]);
let scanner = new SyncScanner();
scanner.verbose = true;
console.log('scanning', filepath);
scanner.scanPath(filepath)
  .then(() => {
    console.log('finished scanning');
    console.log('num of dir:', scanner.dirMap.size);
    console.log('num of file:', scanner.fileMap.size);
    let rootDir = scanner.dirMap.get(filepath);
    if (!rootDir) {
      console.error('failed to get:', filepath);
      process.exit(1);
      return;
    }
    let size = totalSize(rootDir);
    console.log('total size:', size, `(${formatFloat(size / 1024 / 1024)} MB)`);
    checkCrc32Collision(scanner);
    // TODO sync with remote server
    // TODO calc minimal transfer and edit path
    console.log('done');
  });
