import {SyncFile} from "./types";
import {RequestFileMsg} from "../net/types";
import * as path from "path";
import {makeFilePath} from "./utils";
import * as util from "util";

export class SyncFileIndex {
  crc32HexMap: Map<string, SyncFile>;
  sha256HexMap: Map<string, SyncFile>;
  pathMap: Map<string, SyncFile>;

  build(files: SyncFile[]) {
    this.crc32HexMap = new Map<string, SyncFile>();
    this.sha256HexMap = new Map<string, SyncFile>();
    this.pathMap = new Map<string, SyncFile>();
    files.forEach(file => {
      this.crc32HexMap.set(file.crc32Hex, file);
      if (file.sha256Hex) {
        this.sha256HexMap.set(file.sha256Hex, file);
      }
      this.pathMap.set(makeFilePath(file.dirs, file.name), file)
    })
  }

  getFile(msg: RequestFileMsg): SyncFile {
    switch (msg.by) {
      case "crc32Hex":
        return this.crc32HexMap.get(msg.hex);
      case "sha256Hex":
        return this.sha256HexMap.get(msg.hex);
      case "path":
        return this.pathMap.get(makeFilePath(msg.dirs, msg.name));
      default:
        throw new Error('unexpected format: ' + util.inspect(msg, {depth: 99}))
    }
  }
}
