import {SyncDir, SyncFile} from "./types";
import * as path from "path";

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
  let hashs = new Set<string>();
  let f = (dir: SyncDir) => {
    dir.files.forEach(file => {
      if (!hashs.has(file.crc32Hex)) {
        hashs.add(file.crc32Hex);
        acc += file.size;
        return
      }
      if (file.sha256Hex && !hashs.has(file.sha256Hex)) {
        hashs.add(file.sha256Hex);
        acc += file.size;
        return
      }
      // duplicated
      return;
    });
    dir.subDirs.forEach(dir => f(dir));
  };
  f(dir);
  return acc;
}

export function makeFilePath(dirs: string[], name: string): string {
  return path.join(...dirs, name)
}

/**
 * do not compare path
 * */
export function isFileSameContent(local: SyncFile, remote: SyncFile) {
  return (local.size === remote.size)
    && (local.crc32Hex === remote.crc32Hex)
    && (!local.sha256Hex || !remote.sha256Hex || (local.sha256Hex === remote.sha256Hex))
}
