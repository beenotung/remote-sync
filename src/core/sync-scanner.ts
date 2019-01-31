import {Scanner} from "../utils/scanner";
import * as path from "path";
import {SyncDir, SyncFile} from "./types";
import {hashFile, sha256File} from "../utils/hash-file";
import {SyncFileIndex} from "./sync-file-index";

export function makeHashKey(file: SyncFile) {
  return [
    file.size,
    file.crc32Hex,
    file.name
  ].join(':')
}

export class SyncScanner extends Scanner {
  dirMap = new Map<string, SyncDir>();
  fileMap = new Map<string, SyncFile>();
  crc32Map = new Map<string, SyncFile[]>();
  verbose = false;
  /* HashKey -> sha256Hex */
  hashCache = new Map<string, Promise<string>>();
  rootpath: string;
  index: SyncFileIndex = new SyncFileIndex();

  getRootDir(): SyncDir {
    return this.dirMap.get(this.rootpath)
  }

  log(...args) {
    if (this.verbose) {
      console.log(...args);
    }
  }

  async scanPath(filepath: string) {
    this.rootpath = filepath;
    await super.scanPath(filepath);
    let files = Array.from(this.fileMap.values());
    // fs.writeFileSync('files.json', JSON.stringify(files));
    this.index.build(files);
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
    let crc32Hex = (await hashFile(filepath)).toString('hex');
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
        await this.calcSha256(last);
        return
      }
      if ((previous.size === last.size)
        && (previous.name === last.name)) {
        this.log('skip sha256 check on', last.name);
        if (previous.sha256Hex) {
          last.sha256Hex = previous.sha256Hex;
        } else {
          await this.calcSha256(last);
        }
        return;
      }
    }
  }


  async calcSha256(file: SyncFile) {
    let hashKey = makeHashKey(file);
    if (!this.hashCache.has(hashKey)) {
      let filepath = path.join(...file.dirs, file.name);
      this.hashCache.set(hashKey, sha256File(filepath)
        .then(b => b.toString('hex')))
    }
    return this.hashCache.get(hashKey)
      .then(hex => file.sha256Hex = hex)
      ;
  }
}
