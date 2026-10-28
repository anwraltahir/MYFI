import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = zlib.crc32(buf.subarray(4, len + 8));
    buf.writeUInt32BE(crc >>> 0, len + 8);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // create a nice smooth teal-emerald gradient
      const factor = (x + y) / (width + height);
      const pr = Math.round(15 * (1 - factor) + 4 * factor);
      const pg = Math.round(118 * (1 - factor) + 47 * factor);
      const pb = Math.round(110 * (1 - factor) + 46 * factor);

      // Check if inside inner square/card
      const border = width * 0.15;
      const isCard = x > border && x < width - border && y > border && y < height - border;

      if (isCard) {
        rawData[pxOffset] = 20;
        rawData[pxOffset + 1] = 184;
        rawData[pxOffset + 2] = 166;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = pr;
        rawData[pxOffset + 1] = pg;
        rawData[pxOffset + 2] = pb;
        rawData[pxOffset + 3] = a;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, 15, 118, 110));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, 15, 118, 110));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 15, 118, 110));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 15, 118, 110));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, 15, 118, 110));

console.log('PWA PNG Icons generated successfully!');
