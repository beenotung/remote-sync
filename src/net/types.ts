import {SyncDir} from "../core/types";

export enum MsgType {
  list_root = 'list_root',
  root_list = 'root_list',
  request_file = 'request_file',
  provide_file = 'provide_file',
}

export interface ListRootMsg {
  type: MsgType.list_root
}

export interface RootListMsg {
  type: MsgType.root_list
  rootDir: SyncDir
  rootpath: string[]
}

export interface RequestFileMsg {
  type: MsgType.request_file

  // assigned by client
  id: string

  by: 'crc32Hex' | 'sha256Hex' | 'path'

  // when by crc32Hex or sha256Hex
  hex?: string

  // when by path
  dirs?: string[]
  name?: string
}

export interface ProvideFileMsg {
  type: MsgType.provide_file
  port: number
  reqId: string
}

export type Msg =
  ListRootMsg
  | RootListMsg
  | RequestFileMsg
  | ProvideFileMsg
  ;
