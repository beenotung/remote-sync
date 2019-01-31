import {Scanner} from "./scanner";
import * as path from "path";
import {SyncDir, SyncFile} from "./model";
import {crc32File, sha256File} from "./crc32-file";

export class SyncScanner extends Scanner {
  dirMap = new Map<string, SyncDir>();
  fileMap = new Map<string, SyncFile>();
  crc32Map = new Map<string, SyncFile[]>();
  verbose = false;
  sha256HashingFiles = new Map<SyncFile, Promise<string>>();

  log(...args) {
    if (this.verbose) {
      console.log(...args);
    }
  }

  async onScanDir(dirs: string[]): Promise<any> {
    let dirpath = path.join(...dirs);
    this.log('scanning dir:', dirpath);
    let dir: SyncDir = {
      dirs,
      files: [],
      subDirs: [],
    };
    this.dirMap.set(dirpath, dir);
    // attach to parent if any
    let parentDirs = dirs.map(x => x);
    parentDirs.pop();
    let parentDirpath = path.join(...parentDirs);
    if (parentDirpath !== dirpath && this.dirMap.has(parentDirpath)) {
      this.dirMap.get(parentDirpath).subDirs.push(dir);
    }
  }

  async onScanFile(dirs: string[], name: string, size: number): Promise<any> {
    let dirpath = path.join(...dirs);
    let filepath = path.join(dirpath, name);
    // this.log('scanning file:', filepath);
    let crc32Hex = (await crc32File(filepath)).toString('hex');
    let file: SyncFile = {
      dirs,
      name,
      size,
      crc32Hex,
      // sha256Hex: sha256.toString('hex')
    };
    this.fileMap.set(filepath, file);
    let dir = this.dirMap.get(dirpath);
    dir.files.push(file);
    if (this.hasCrc32(crc32Hex)) {
      let crcFiles = this.crc32Map.get(crc32Hex);
      crcFiles.push(file);
      this.log('duplicated crc32 on:', new Set(crcFiles.map(file => file.name)));
      await this.handleDuplicatedCrc32(crcFiles);
    } else {
      this.crc32Map.set(crc32Hex, [file]);
    }
  }

  hasCrc32(crc: string) {
    return this.crc32Map.has(crc);
  }

  async handleDuplicatedCrc32(crc32Files: SyncFile[]) {
    let last = crc32Files[crc32Files.length - 1];
    for (let previous of crc32Files) {
      if (previous === last) {
        // last one
        await this.calcSha256(previous);
        return
      }
      if ((previous.size === last.size)
        && (previous.name === last.name)) {
        this.log('skip sha256 check on', last.name);
        if (previous.sha256Hex) {
          last.sha256Hex = previous.sha256Hex;
        } else {
          last.sha256Hex = await this.calcSha256(previous);
        }
        return;
      }
    }
  }


  async calcSha256(file: SyncFile) {
    if (!this.sha256HashingFiles.has(file)) {
      this.sha256HashingFiles.set(file, (async () => {
        let filepath = path.join(...file.dirs, file.name);
        let sha256 = await sha256File(filepath);
        file.sha256Hex = sha256.toString('hex');
        return file.sha256Hex;
      })());
    }
    return this.sha256HashingFiles.get(file);
  }
}
