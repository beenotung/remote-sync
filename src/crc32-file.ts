let fs = require('fs');
let crc32 = require('buffer-crc32');
let crypto = require('crypto');

export async function crc32File(filepath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let acc = crc32('');
    fs.createReadStream(filepath)
      .on('data', buffer => {
        // console.log('calculating crc32:', filepath);
        acc = crc32(buffer, acc);
      })
      .on('end', () => resolve(acc))
      .on('error', e => reject(e))
  });
}

export async function sha256File(filepath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash('sha256');
    fs.createReadStream(filepath)
      .on('data', buffer => {
        // console.log('calculating sha256:', filepath);
        hash.update(buffer);
      })
      .on('end', () => resolve(hash.digest()))
      .on('error', e => reject(e))
  })
}
