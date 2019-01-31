import {SyncClient} from "../net/sync-client";
import {RootListMsg} from "../net/types";
import {SyncFileIndex} from "./sync-file-index";
import {SyncScanner} from "./sync-scanner";
import {SyncFile} from "./types";
import {replaceRemotePathToLocalPath, sameRemotePathLocalPath, splitFilepath} from "../utils/path";
import {pfs} from "../utils/scanner";
import {makeFilePath} from "./utils";

export function remoteFileToLocalFile(args: { remoteFile: SyncFile, remoteRootPaths: string[], localRootPaths: string[] }): SyncFile {
  let {remoteFile, localRootPaths, remoteRootPaths} = args;
  let localFile = Object.assign({}, remoteFile);
  // console.error(inspect({args, localFile}, {depth: 99}));
  localFile.dirs = replaceRemotePathToLocalPath({
    remoteFilePaths: remoteFile.dirs,
    localRootPaths,
    remoteRootPaths,
  });
  // console.error(inspect({args, localFile}, {depth: 99}));
  return localFile;
}

/**
 * best: download, move and delete smartly
 *
 * current: download if needed,
 *          then copy if needed,
 *          then delete if needed
 *
 * TODO combine copy+delete into move
 * TODO calc minimal transfer and edit path, then request files
 * */
export async function plan(syncClient: SyncClient, scanner: SyncScanner, msg: RootListMsg) {
  let localRootPaths = splitFilepath(scanner.rootpath);
  let remoteRootPaths = msg.rootpath;

  let localIndex = scanner.index;
  let remoteIndex = new SyncFileIndex();
  remoteIndex.buildFromRootDir(msg.rootDir);

  function remoteToLocal(remoteFile: SyncFile) {
    return remoteFileToLocalFile({remoteFile, remoteRootPaths, localRootPaths})
  }

  async function moveFile(localFile: SyncFile, remoteFile: SyncFile) {
    let destFile = remoteToLocal(remoteFile);
    let oldFilePath = makeFilePath(localFile.dirs, localFile.name);
    let newFilePath = makeFilePath(destFile.dirs, destFile.name);
    localIndex.pathMap.set(newFilePath, localIndex.pathMap.get(oldFilePath));
    localIndex.pathMap.delete(oldFilePath);
    await pfs.rename(oldFilePath, newFilePath);
  }

  // async function copyFile(src: string, dest: string) {
  async function copyFile(localFile: SyncFile, localDestFile: SyncFile) {
    // let destFile = remoteToLocal(remoteFile);
    let src = makeFilePath(localFile.dirs, localFile.name);
    let dest = makeFilePath(localDestFile.dirs, localDestFile.name);
    localIndex.pathMap.set(dest, localDestFile);
    // localIndex.pathMap.set(dest, localIndex.pathMap.get(src));
    await pfs.copyFile(src, dest);
  }

  async function deleteFile(localFile: SyncFile) {
    let filepath = makeFilePath(localFile.dirs, localFile.name);
    localIndex.pathMap.delete(filepath);
    await pfs.unlink(filepath)
  }

  function downloadFile(remoteFile: SyncFile, localFiles: SyncFile[]) {
    // console.log('downloadFile, local:', localFiles);
    if (remoteFile.sha256Hex) {
      syncClient.requestFileByHex('sha256Hex', remoteFile.sha256Hex, localFiles);
      return;
    }
    syncClient.requestFileByHex('crc32Hex', remoteFile.crc32Hex, localFiles);
  }

  let needDownload = (remoteFile: SyncFile) => !localIndex.hasFile(remoteToLocal(remoteFile));
  let needKeep = (localFile: SyncFile) => remoteIndex.hasFile(localFile);
  let needMove = (localFile: SyncFile, remoteFile: SyncFile) => !sameRemotePathLocalPath({
    remoteRootPaths,
    localRootPaths,
    remoteFilePaths: [...remoteFile.dirs, remoteFile.name],
    localFilePaths: [...localFile.dirs, localFile.name],
  });

  // check for files to download
  let checkFileDownload = (remoteFile: SyncFile) => {
    if (needDownload(remoteFile)) {
      let remoteFiles = remoteIndex.getFilesByDesc(remoteFile);
      let localFiles = remoteFiles.map(file => remoteToLocal(file));
      downloadFile(remoteFile, localFiles)
    }
  };
  Array.from(remoteIndex.sha256HexMap.values()).forEach(file => checkFileDownload(file));
  Array.from(remoteIndex.crc32HexMap.values()).forEach(file => {
    if (!file.sha256Hex) {
      checkFileDownload(file);
    }
  });

  // check for copy
  await Promise.all(remoteIndex.allFiles().map(async remoteFile => {
    let localDestFile = remoteToLocal(remoteFile);
    // let localFile = localIndex.getFileByDesc(localDestFile);
    if (!localIndex.hasFile(localDestFile)) {
      // will be downloaded
      // console.error('why no file?');
      // process.exit(1);
      return;
    }
    let localFiles = localIndex.getFilesByDesc(localDestFile);
    if (localFiles.length < 1) {
      console.error('why not found?');
      process.exit(1);
    }
    await copyFile(localFiles[0], localDestFile)
  }));

  // check for files to delete
  await Array.from(localIndex.pathMap.values()).map(localFile => {
    if (!needKeep(localFile)) {
      return deleteFile(localFile);
    }
  })

  // update local index?
}

