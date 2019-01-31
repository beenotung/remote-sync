export interface SyncFile {
  dirs: string[]
  name: string
  size: number
  crc32Hex: string
  sha256Hex?: string
}

export interface SyncDir {
  dirs: string[]
  files: SyncFile[]
  subDirs: SyncDir[]
}
