import * as net from "net";
import {Socket} from "net";
import {SyncSocket} from "./sync-socket";
import {Msg, MsgType} from "./types";
import {SyncScanner} from "../core/sync-scanner";
import {SyncFile} from "../core/types";
import {makeFilePath} from "../core/utils";
import * as fs from "fs";
import {splitFilepath} from "../utils/path";
import {fsTaskPool} from "../utils/values";

export class SyncServer extends SyncSocket {
  constructor(public client: Socket, public scanner: SyncScanner) {
    super(client)
  }

  async onMsg(msg: Msg) {
    switch (msg.type) {
      case MsgType.list_root: {
        let root = this.scanner.getRootDir();
        this.sendMsg({
          type: MsgType.root_list,
          rootDir: root,
          rootpath: splitFilepath(this.scanner.rootpath),
        });
        break;
      }
      case MsgType.request_file: {
        let file = this.scanner.index.getFile(msg);
        let port = await this.sendFile(file);
        // console.log('sending file:', {port, file});
        this.sendMsg({
          type: MsgType.provide_file,
          port,
          reqId: msg.id,
        });
        break;
      }
      default:
        console.log('unknown message:', msg);
    }
  }

  async sendFile(file: SyncFile): Promise<number> {
    // console.log('sendFile:', file);
    return fsTaskPool.queue(() => new Promise<number>((resolve, reject) => {
        let server = net.createServer(client => {
          client
            .once('data', () => fsTaskPool.queue(() => new Promise((resolve1, reject1) => {
              let filepath = makeFilePath(file.dirs, file.name);
              // console.log('sending file to client:', filepath);
              fs.createReadStream(filepath)
                .pipe(client, {end: true})
                .on("error", err => {
                  reject1(err);
                  server.close();
                })
                .on("close", () => {
                  // console.log('finished sending file to client:', filepath);
                  resolve1();
                  server.close();
                })
            })))
            .on("error", err => reject(err))
        })
          .on("error", err => reject(err))
          .listen(() => {
            resolve(server.address().port)
          })
      }
    ));
  }
}
