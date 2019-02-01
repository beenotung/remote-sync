import {SyncScanner} from "./core/sync-scanner";
import {SyncFile} from "./core/types";
import {deduplicatedTotalSize, totalSize} from "./core/utils";
import {formatFloat} from "./utils/format";
import {inspect} from "util";
import {correctFilepath} from "./utils/path";
import * as net from "net";
import {SyncServer} from "./net/sync-server";
import {SyncClient} from "./net/sync-client";

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

export async function scanRoot(rootpath: string) {
  let filepath = correctFilepath(rootpath);
  let scanner = new SyncScanner();
  scanner.verbose = true;
  console.log('scanning', filepath);
  await scanner.scanPath(filepath)
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
      console.log(`total size: ${size} (${formatFloat(size / 1024 / 1024)} MB)`);
      size = deduplicatedTotalSize(rootDir);
      console.log(`deduplicated size: ${size} (${formatFloat(size / 1024 / 1024)} MB)`);
      checkCrc32Collision(scanner);
    });
  return scanner;
}

export async function main_server(port: string, rootpath: string) {
  console.log('starting server');
  let scanner = await scanRoot(rootpath);
  let server = net.createServer(client => {
    console.log('connected from client:', client.remoteAddress);
    let syncServer = new SyncServer(client, scanner);
    client
      .on('data', data => syncServer.onData(data))
      .on("error", err => console.error('client from:', client.remoteAddress, 'error:', err))
      .on("end", () => console.log('client disconnected from:', client.remoteAddress))
  })
    .on("error", err => console.error('server socket error:', err))
    .on("close", () => console.log('server socket closed'))
    .listen(+port, '0.0.0.0', () => {
      let serverInfo = server.address();
      console.log(`listening on ${serverInfo.address}:${serverInfo.port} (${serverInfo.family})`);
    });
}

export async function main_client(host: string, port: string, rootpath: string) {
  console.log('starting client');
  let scanner = await scanRoot(rootpath);
  console.log(`connecting to ${host}:${port}`);
  let connected = false;
  let server = new net.Socket()
    .on('data', data => syncClient.onData(data))
    .on('error', err => console.error('socket error:', err))
    .on('close', () => {
      if (!connected) {
        console.log('Failed to connect to server.');
        console.log('If you are sure the server is running, and finished scanning, check the hostname and network availability.');
      } else {
        console.log('socket closed');
      }
    })
    .connect({host, port: +port}, () => {
      connected = true;
      console.log(`connected to ${host}:${port}`);
      syncClient.onConnected();
    })
  ;
  let syncClient = new SyncClient(server, scanner);
}


