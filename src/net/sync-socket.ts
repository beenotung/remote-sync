import {Socket} from "net";
import {Msg} from "./types";

export abstract class SyncSocket {
  constructor(public socket: Socket) {
  }

  accText = '';

  onData(data: Buffer) {
    let text = data.toString();
    this.accText += text;
    if (text.indexOf('\n') === -1) {
      return;
    }
    for (; ;) {
      let idx = this.accText.indexOf('\n');
      if (idx === -1) {
        if (this.accText.length !== 0) {
          console.error('maybe the message is chucked, acc message length:', this.accText.length);
        }
        return
      }
      let line = this.accText.substring(0, idx);
      let msg = JSON.parse(line);
      this.onMsg(msg);
      this.accText = this.accText.substring(idx + 1);
    }
  }

  abstract onMsg(msg: Msg)

  sendMsg(msg: Msg) {
    this.socket.write(JSON.stringify(msg));
    this.socket.write('\n');
  }
}
