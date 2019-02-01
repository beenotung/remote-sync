import * as net from "net";
import {Socket} from "net";
import {SyncSocket} from "./sync-socket";
import {Msg, MsgType, ProvideFileMsg, RequestFileMsg} from "./types";
import {SyncScanner} from "../core/sync-scanner";
import * as fs from "fs";
import {makeFilePath, totalSize} from "../core/utils";
import {SyncDir, SyncFile} from "../core/types";
import {fsTaskPool} from "../utils/values";
import {plan} from "../core/sync-planner";
import * as path from "path";
import {pfs} from "../utils/pfs";
import {SyncFileIndex} from "../core/sync-file-index";
import {formatFloat} from "../utils/format";


export class SyncClient extends SyncSocket {
  // pendingFileRequests = new Map<string, RequestFileMsg>();
  pendingFiles = new Map<string, SyncFile[]>();

  msgIdCounter = 0;

  // for progress report
  remoteIndex: SyncFileIndex;
  remoteTotalSize: number;
  localRootDir: SyncDir;

  constructor(public server: Socket, public scanner: SyncScanner) {
    super(server)
  }

  onConnected() {
    this.sendMsg({type: MsgType.list_root});
  }

  async onMsg(msg: Msg) {
    switch (msg.type) {
      case MsgType.root_list: {
        // console.log('received root list:', msg.rootDir);
        await plan(this, this.scanner, msg);
        this.checkAllDone();
        break;
      }
      case MsgType.provide_file: {
        this.checkAllDone();
        await this.receiveFile(msg);
        this.pendingFiles.delete(msg.reqId);
        this.checkAllDone();
        break
      }
      default:
        console.log('unknown message:', msg)
    }
  }

  requestFileByHex(name: 'crc32Hex' | 'sha256Hex', hex: string, localFiles: SyncFile[]) {
    this.msgIdCounter++;
    this.sendFileRequest({
      type: MsgType.request_file,
      id: this.msgIdCounter.toString(16),
      by: name,
      hex,
    }, localFiles)
  }

  requestFileByPath(dirs: string[], name: string, localFiles: SyncFile[]) {
    this.msgIdCounter++;
    this.sendFileRequest({
      type: MsgType.request_file,
      id: this.msgIdCounter.toString(16),
      by: "path",
      dirs,
      name,
    }, localFiles)
  }

  sendFileRequest(msg: RequestFileMsg, files: SyncFile[]) {
    // console.log('request file:', msg);
    // this.pendingFileRequests.set(msg.id, msg);
    this.pendingFiles.set(msg.id, files);
    this.sendMsg(msg)
  }

  getDestFile(reqId: string): SyncFile[] {
    return this.pendingFiles.get(reqId)
  }

  async receiveFile(msg: ProvideFileMsg) {
    return fsTaskPool.queue(() => new Promise((resolve, reject) => {
        let server = new net.Socket()
          .on('error', err => {
            server.end();
            reject(err);
          })
          .connect({host: this.server.remoteAddress, port: msg.port}, async () => {
            server.write('start\n');
            let files = this.getDestFile(msg.reqId);
            // console.log('receive file:', {msg, files});
            if (files.length === 0) {
              server.end();
              resolve();
              return;
            }
            let file = files.pop();
            let filepath = makeFilePath(file.dirs, file.name);
            // console.log('filepath:', filepath);
            await pfs.mkdir_p_once(path.join(...file.dirs));
            server.pipe(fs.createWriteStream(filepath))
              .on("close", async () => {
                // console.log('finished download file to:', filepath);
                server.end();
                await Promise.all(files.map(async otherFile => {
                  let otherFilePath = makeFilePath(otherFile.dirs, otherFile.name);
                  let otherDirPath = path.join(...otherFile.dirs);
                  await pfs.mkdir_p_once(otherDirPath);
                  await pfs.copyFile(filepath, otherFilePath);
                }));
                resolve();
              })
          })
      }
    ));
  }

  checkAllDone() {
    if (this.pendingFiles.size === 0) {
      console.log();
      console.log('all files are downloaded');
      this.server.end();
    } else {
      this.report();
    }
  }

  report() {
    let localTotalSize = totalSize(this.localRootDir);
    let p = formatFloat(localTotalSize / this.remoteTotalSize * 100) + '%';
    let size = formatFloat(localTotalSize / 1024 / 1024) + 'MB';
    process.stdout.write(`\r  downloading ${this.pendingFiles.size} files | total size: ${localTotalSize}/${this.remoteTotalSize} (${size}, ${p})`);
  }
}
