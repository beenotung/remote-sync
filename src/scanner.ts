import * as fs from "fs";
import * as util from "util";
import * as path from "path";

export namespace pfs {
  export let readdir = util.promisify(fs.readdir);
  export let stat = util.promisify(fs.stat);
  export let lstat = util.promisify(fs.lstat);
}

export abstract class Scanner {
  abstract async onScanDir(dirs: string[])

  abstract async onScanFile(dirs: string[], name: string, size: number)

  async scanDir(dirs: string[]) {
    let p = this.onScanDir(dirs);
    let dir = path.join(...dirs);
    let files: string[] = await pfs.readdir(dir);
    await Promise.all([p, ...files.map(name => this.scanFile(dirs, name))]);
  }

  async scanFile(dirs: string[], name: string) {
    let filepath = path.join(...dirs, name);
    let stat = await pfs.stat(filepath);
    if (stat.isSymbolicLink()) {
      console.warn('follow symbolic link:', filepath);
      stat = await pfs.lstat(filepath)
    }
    if (stat.isDirectory()) {
      await this.scanDir([...dirs, name]);
      return;
    }
    await this.onScanFile(dirs, name, stat.size);
  }

  async scanPath(filepath: string) {
    let dir = path.dirname(filepath);
    let name = path.basename(filepath);
    await this.scanFile([dir], name);
  }
}


