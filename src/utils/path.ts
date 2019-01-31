import * as path from "path";

export function correctFilepath(filepath: string) {
  let dir = path.dirname(filepath);
  let base = path.basename(filepath);
  return path.join(dir, base);
}

export function splitFilepath(filepath: string): string[] {
  let paths: string[] = [];
  for (; ;) {
    let dir = path.dirname(filepath);
    let base = path.basename(filepath);
    if (base === '') {
      // being the top level, e.g. '/'
      paths.push(dir);
      return paths.reverse();
    }
    if (dir === base) {
      // begin the top level, e.g. '.'
      return paths.reverse();
    }
    paths.push(base);
    filepath = dir;
  }
}

export function sameRemotePathLocalPath(args: { localFilePaths: string[], remoteFilePaths: string[], localRootPaths: string[], remoteRootPaths: string[] }): boolean {
  let {remoteFilePaths, localRootPaths, remoteRootPaths, localFilePaths} = args;
  let remoteIsRelative = remoteRootPaths.every((p, i) => remoteFilePaths[i] === p);
  let localIsRelative = localRootPaths.every((p, i) => localFilePaths[i] === p);
  if (remoteIsRelative && localIsRelative) {
    let remoteRelativePath = remoteFilePaths.slice(remoteRootPaths.length);
    let localRelativePath = localFilePaths.slice(localRootPaths.length);
    return remoteRelativePath.length === localRelativePath.length && remoteRelativePath.every((p, i) => localRelativePath[i] === p);
  }
  console.error('why?');
  process.exit(1);
  return false;
}

export function replaceRemotePathToLocalPath(args: { remoteFilePaths: string[], localRootPaths: string[], remoteRootPaths: string[] }): string[] {
  let {remoteFilePaths, localRootPaths, remoteRootPaths} = args;
  if (remoteRootPaths.every((p, i) => remoteFilePaths[i] === p)) {
    let relativePaths = remoteFilePaths.slice(remoteRootPaths.length);
    return [...localRootPaths, ...relativePaths]
  } else {
    return [...remoteFilePaths]
  }
}
