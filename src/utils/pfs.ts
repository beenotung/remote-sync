import * as util from "util";
import * as fs from "fs";
import {fsTaskPool} from "./values";

let _mkdir_p = require('mkdir-p');
// let rimraf = require('rimraf');

export namespace pfs {

  function wrap(f) {
    f = util.promisify(f);
    return (...args) => fsTaskPool.queue(() => f(...args))
  }

  export let readdir = wrap(fs.readdir);
  export let stat = wrap(fs.stat);
  export let lstat = wrap(fs.lstat);
  export let copyFile = wrap(fs.copyFile);
  export let unlink = wrap(fs.unlink);
  export let mkdir = wrap(fs.mkdir);
  export let rmdir = wrap(fs.rmdir);
  export let rename = wrap(fs.rename);
  export let mkdir_p = wrap(_mkdir_p);

  // export let rm_p = util.promisify(rimraf)

  let mkdir_p_store = {};

  export async function mkdir_p_once(filepath: string) {
    let p = mkdir_p_store[filepath];
    if (!p) {
      // console.log('mkdir -p:', filepath);
      p = mkdir_p_store[filepath] = mkdir_p(filepath);
    }
    return p;
  }
}
