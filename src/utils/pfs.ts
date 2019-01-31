import * as util from "util";
import * as fs from "fs";

let _mkdir_p = require('mkdir-p');
// let rimraf = require('rimraf');

export namespace pfs {
  export let readdir = util.promisify(fs.readdir);
  export let stat = util.promisify(fs.stat);
  export let lstat = util.promisify(fs.lstat);
  export let copyFile = util.promisify(fs.copyFile);
  export let unlink = util.promisify(fs.unlink);
  export let mkdir = util.promisify(fs.mkdir);
  export let rmdir = util.promisify(fs.rmdir);
  export let rename = util.promisify(fs.rename);
  export let mkdir_p = util.promisify(_mkdir_p);
  // export let rm_p = util.promisify(rimraf)
}
