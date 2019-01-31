import * as net from "net";
import {Socket} from "net";
import {SyncSocket} from "./sync-socket";
import {Msg, MsgType, ProvideFileMsg, RequestFileMsg} from "./types";
import {SyncScanner} from "../core/sync-scanner";
import * as fs from "fs";
import {makeFilePath} from "../core/utils";
import {SyncDir, SyncFile} from "../core/types";
import {replaceRootPath, splitFilepath} from "../utils/path";
import {inspect} from "util";

function remoteFileToLocalFile(args: { remoteFile: SyncFile, remoteRootPaths: string[], localRootPaths: string[] }): SyncFile {
  let {remoteFile} = args;
  let localFile = Object.assign({}, remoteFile);
  // console.error(inspect({args, localFile}, {depth: 99}));
  localFile.dirs = replaceRootPath({
    filepaths: remoteFile.dirs,
    localpaths: args.localRootPaths,
    remotepaths: args.remoteRootPaths
  });
  // console.error(inspect({args, localFile}, {depth: 99}));
  return localFile;
}

export class SyncClient extends SyncSocket {
  pendingFileRequests = new Map<string, RequestFileMsg>();
  pendingFiles = new Map<string, SyncFile[]>();

  msgIdCounter = 0;

  constructor(public server: Socket, public scanner: SyncScanner) {
    super(server)
  }

  onConnected() {
    this.sendMsg({type: MsgType.list_root});
  }

  async onMsg(msg: Msg) {
    switch (msg.type) {
      case MsgType.root_list: {
        console.log('received root list:', msg.rootDir);
        // TODO calc minimal transfer and edit path, then request files
        let remoteRootDir = msg.rootDir;
        let localRootDir = this.scanner.getRootDir();
        let f = (remoteDir: SyncDir) => {
          remoteDir.files.forEach(remoteFile => {
            this.msgIdCounter++;
            let localFile = remoteFileToLocalFile({
              remoteFile,
              localRootPaths: splitFilepath(this.scanner.rootpath),
              remoteRootPaths: msg.rootpath,
            });
            this.sendFileRequest({
              type: MsgType.request_file,
              id: this.msgIdCounter.toString(16),
              by: "path",
              dirs: remoteFile.dirs,
              name: remoteFile.name,
            }, [localFile])
          });
          remoteDir.subDirs.forEach(dir => f(dir));
        };
        f(remoteRootDir);
        break;
      }
      case MsgType.provide_file: {
        await this.receiveFile(msg);
        break
      }
      default:
        console.log('unknown message:', msg)
    }
  }

  sendFileRequest(msg: RequestFileMsg, files: SyncFile[]) {
    // console.log('request file:', msg);
    this.pendingFileRequests.set(msg.id, msg);
    this.pendingFiles.set(msg.id, files);
    this.sendMsg(msg)
  }

  getDestFile(reqId: string): SyncFile[] {
    return this.pendingFiles.get(reqId)
  }

  async receiveFile(msg: ProvideFileMsg) {
    return new Promise((resolve, reject) => {
      let server = new net.Socket()
        .on('error', err => {
          server.end();
          reject(err);
        })
        .connect({host: this.server.remoteAddress, port: msg.port}, () => {
          let files = this.getDestFile(msg.reqId);
          console.log('receive file:', {msg, files});
          if (files.length === 0) {
            server.end();
            resolve();
            return;
          }
          let file = files.pop();
          let filepath = makeFilePath(file.dirs, file.name);
          console.log('filepath:', filepath);
          server.pipe(fs.createWriteStream(filepath))
            .on("close", () => {
              server.end();
              resolve();
              // TODO copy to other needed files
            })
        })
    })
  }
}
