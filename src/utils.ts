import {SyncDir, SyncFile} from "./model";
import * as path from "path";

export function correctFilepath(filepath: string) {
  let dir = path.dirname(filepath);
  let base = path.basename(filepath);
  return path.join(dir, base);
}

export function totalSize(dir: SyncDir) {
  let acc = 0;
  let f = (dir: SyncDir) => {
    dir.files.forEach(file => acc += file.size);
    dir.subDirs.forEach(dir => f(dir))
  };
  f(dir);
  return acc;
}

export function deduplicatedTotalSize(dir: SyncDir) {
  let acc = 0;
  let f = (dir: SyncDir) => {
    dir.files.forEach(file => {

    });
    dir.subDirs.forEach(dir => f(dir));
  };
  return acc;
}
