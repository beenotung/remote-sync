import * as path from "path";

export function correctFilepath(filepath: string) {
  let dir = path.dirname(filepath);
  let base = path.basename(filepath);
  return path.join(dir, base);
}

