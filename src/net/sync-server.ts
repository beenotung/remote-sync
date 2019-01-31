import * as net from "net";
import {Socket} from "net";
import {SyncSocket} from "./sync-socket";
import {Msg, MsgType} from "./types";
import {SyncScanner} from "../core/sync-scanner";
import {SyncFile} from "../core/types";
import {makeFilePath} from "../core/utils";
import * as fs from "fs";

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
    return new Promise<number>((resolve, reject) => {
      let server = net.createServer(socket => {
        socket
          .on("connect", () => {
            let filepath = makeFilePath(file.dirs, file.name);
            fs.createReadStream(filepath)
              .pipe(socket, {end: true})
              .on("close", () => server.close())
          })
          .on("error", err => reject(err))
      })
        .on("error", err => reject(err))
        .listen(() => {
          resolve(server.address().port)
        })
    })
  }
}
