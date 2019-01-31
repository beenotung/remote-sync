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

export function replaceRootPath(args: { filepaths: string[], localpaths: string[], remotepaths: string[] }): string[] {
  let {filepaths, localpaths, remotepaths} = args;
  if (remotepaths.every((p, i) => filepaths[i] === p)) {
    let relativepaths = filepaths.slice(remotepaths.length);
    return [...localpaths, ...relativepaths]
  } else {
    return [...filepaths]
  }
}
