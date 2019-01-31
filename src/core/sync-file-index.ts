import {SyncDir, SyncFile} from "./types";
import {RequestFileMsg} from "../net/types";
import * as path from "path";
import {isFileSameContent, makeFilePath} from "./utils";
import * as util from "util";

export class SyncFileIndex {
  crc32HexMap: Map<string, SyncFile>;
  sha256HexMap: Map<string, SyncFile>;
  pathMap: Map<string, SyncFile>;

  build(files: SyncFile[]) {
    this.crc32HexMap = new Map();
    this.sha256HexMap = new Map();
    this.pathMap = new Map<string, SyncFile>();
    files.forEach(file => {
      this.crc32HexMap.set(file.crc32Hex, file);
      if (file.sha256Hex) {
        this.sha256HexMap.set(file.sha256Hex, file);
      }
      this.pathMap.set(makeFilePath(file.dirs, file.name), file)
    })
  }

  buildFromRootDir(rootDir: SyncDir) {
    let files: SyncFile[] = [];
    let f = (dir: SyncDir) => {
      files.push(...dir.files);
      dir.subDirs.forEach(dir => f(dir));
    };
    f(rootDir);
    this.build(files)
  }

  getFile(msg: RequestFileMsg): SyncFile {
    // console.log('getFile:', msg);
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

  /**
   * do not consider path
   * */
  getFilesByDesc(desc: SyncFile): SyncFile[] {
    return this.allFiles().filter(file => isFileSameContent(file, desc));
  }

  allFiles(): SyncFile[] {
    return Array.from(this.pathMap.values())
  }

  /**
   * do not consider path
   * */
  hasFile(descFile: SyncFile): boolean {
    let file: SyncFile;
    if (!file && descFile.sha256Hex) {
      file = this.sha256HexMap.get(descFile.sha256Hex)
    }
    if (!file) {
      file = this.crc32HexMap.get(descFile.crc32Hex);
    }
    return file && file.size === descFile.size;
  }
}
