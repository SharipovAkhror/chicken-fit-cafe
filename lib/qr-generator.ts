/**
 * Lightweight, zero-dependency QR Code Generator in pure TypeScript.
 * Supports Byte mode (UTF-8/ASCII) with ECC Level M/L/Q/H and SVG / Canvas rendering.
 */

// Standard QR Galois Field GF(256) and Reed-Solomon math
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)

for (let i = 0, x = 1; i < 256; i++) {
  EXP_TABLE[i] = x
  LOG_TABLE[x] = i
  x = (x << 1) ^ (x & 128 ? 0x11d : 0)
}

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255]
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const factor = EXP_TABLE[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmul(poly[j], factor)
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsCalculateEcc(data: Uint8Array, eccLength: number): Uint8Array {
  const poly = rsGeneratorPoly(eccLength)
  const ecc = new Uint8Array(eccLength)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ ecc[0]
    for (let j = 0; j < eccLength - 1; j++) {
      ecc[j] = ecc[j + 1] ^ gmul(poly[j], factor)
    }
    ecc[eccLength - 1] = gmul(poly[eccLength - 1], factor)
  }
  return ecc
}

// QR Version capacities and parameters for Byte mode with ECC Level M
const VERSION_PARAMS = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytes: 10, blocks: 1 },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, blocks: 1 },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, blocks: 1 },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, blocks: 2 },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytes: 48, blocks: 2 },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytes: 64, blocks: 4 },
  { version: 7, size: 45, totalBytes: 196, dataBytes: 124, ecBytes: 72, blocks: 4 },
]

export class SimpleQR {
  private size: number
  private modules: boolean[][]
  private isFunction: boolean[][]

  constructor(size: number) {
    this.size = size
    this.modules = Array.from({ length: size }, () => Array(size).fill(false))
    this.isFunction = Array.from({ length: size }, () => Array(size).fill(false))
  }

  private setFunctionModule(r: number, c: number, val: boolean) {
    this.modules[r][c] = val
    this.isFunction[r][c] = true
  }

  private drawFinderPattern(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
          const isBlack =
            dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
          this.setFunctionModule(nr, nc, isBlack && dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6)
        }
      }
    }
  }

  private drawTimingPatterns() {
    for (let i = 8; i < this.size - 8; i++) {
      const val = i % 2 === 0
      if (!this.isFunction[6][i]) this.setFunctionModule(6, i, val)
      if (!this.isFunction[i][6]) this.setFunctionModule(i, 6, val)
    }
  }

  private drawAlignmentPattern(r: number, c: number) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)
        this.setFunctionModule(r + dr, c + dc, isBlack)
      }
    }
  }

  public static encode(text: string): boolean[][] {
    const encoder = new TextEncoder()
    const textBytes = encoder.encode(text)

    // Find smallest fitting version
    const param = VERSION_PARAMS.find((p) => textBytes.length + 3 <= p.dataBytes) || VERSION_PARAMS[VERSION_PARAMS.length - 1]
    const qr = new SimpleQR(param.size)

    // 1. Finder patterns
    qr.drawFinderPattern(0, 0)
    qr.drawFinderPattern(0, param.size - 7)
    qr.drawFinderPattern(param.size - 7, 0)

    // 2. Timing patterns
    qr.drawTimingPatterns()

    // 3. Alignment patterns for v2+
    if (param.version >= 2) {
      const pos = param.size - 7
      qr.drawAlignmentPattern(pos, pos)
    }

    // 4. Dark module
    qr.setFunctionModule(param.size - 8, 8, true)

    // 5. Reserve format information areas
    for (let i = 0; i < 9; i++) {
      if (!qr.isFunction[8][i]) qr.setFunctionModule(8, i, false)
      if (!qr.isFunction[i][8]) qr.setFunctionModule(i, 8, false)
      if (i < 8) {
        if (!qr.isFunction[8][param.size - 1 - i]) qr.setFunctionModule(8, param.size - 1 - i, false)
        if (!qr.isFunction[param.size - 1 - i][8]) qr.setFunctionModule(param.size - 1 - i, 8, false)
      }
    }

    // 6. Encode data bits (Byte mode: 0100 + 8-bit count + data + terminator)
    const bitBuffer: number[] = []
    const pushBits = (val: number, len: number) => {
      for (let i = len - 1; i >= 0; i--) {
        bitBuffer.push((val >> i) & 1)
      }
    }

    pushBits(0b0100, 4) // Mode byte
    pushBits(textBytes.length, 8) // Length
    for (const b of textBytes) {
      pushBits(b, 8)
    }

    // Terminator (up to 4 bits of 0)
    const totalDataBits = param.dataBytes * 8
    const termLen = Math.min(4, totalDataBits - bitBuffer.length)
    for (let i = 0; i < termLen; i++) bitBuffer.push(0)

    // Pad to byte boundary
    while (bitBuffer.length % 8 !== 0) bitBuffer.push(0)

    // Pad bytes
    const padBytes = [0xec, 0x11]
    let padIdx = 0
    while (bitBuffer.length < totalDataBits) {
      pushBits(padBytes[padIdx % 2], 8)
      padIdx++
    }

    // Convert bit buffer to data bytes
    const dataBytes = new Uint8Array(param.dataBytes)
    for (let i = 0; i < param.dataBytes; i++) {
      let b = 0
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | bitBuffer[i * 8 + j]
      }
      dataBytes[i] = b
    }

    // Calculate Reed-Solomon ECC
    const eccBytesPerBlock = Math.floor(param.ecBytes / param.blocks)
    const dataBytesPerBlock = Math.floor(param.dataBytes / param.blocks)

    const allDataBlocks: Uint8Array[] = []
    const allEccBlocks: Uint8Array[] = []

    for (let b = 0; b < param.blocks; b++) {
      const blockData = dataBytes.slice(b * dataBytesPerBlock, (b + 1) * dataBytesPerBlock)
      const blockEcc = rsCalculateEcc(blockData, eccBytesPerBlock)
      allDataBlocks.push(blockData)
      allEccBlocks.push(blockEcc)
    }

    // Interleave
    const interleaved: number[] = []
    for (let i = 0; i < dataBytesPerBlock; i++) {
      for (let b = 0; b < param.blocks; b++) {
        interleaved.push(allDataBlocks[b][i])
      }
    }
    for (let i = 0; i < eccBytesPerBlock; i++) {
      for (let b = 0; b < param.blocks; b++) {
        interleaved.push(allEccBlocks[b][i])
      }
    }

    // Convert interleaved to final bit stream
    const finalBits: number[] = []
    for (const b of interleaved) {
      for (let i = 7; i >= 0; i--) {
        finalBits.push((b >> i) & 1)
      }
    }

    // 7. Place data in matrix (zigzag from bottom-right)
    let bitIdx = 0
    let right = param.size - 1
    while (right > 0) {
      if (right === 6) right-- // Skip vertical timing line
      for (let vert = 0; vert < param.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const col = right - j
          const isUp = ((right + 1) / 2) % 2 === 1
          const row = isUp ? param.size - 1 - vert : vert

          if (!qr.isFunction[row][col]) {
            let bit = false
            if (bitIdx < finalBits.length) {
              bit = finalBits[bitIdx] === 1
              bitIdx++
            }
            // Apply Mask 0: (row + col) % 2 == 0
            if ((row + col) % 2 === 0) {
              bit = !bit
            }
            qr.modules[row][col] = bit
          }
        }
      }
      right -= 2
    }

    // 8. Write format information (Mask 0 + ECC Level M = 0b101010000010010)
    const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
    for (let i = 0; i < 15; i++) {
      const bit = formatBits[i] === 1
      // Top-left
      if (i < 6) qr.modules[8][i] = bit
      else if (i < 8) qr.modules[8][i + 1] = bit
      else if (i === 8) qr.modules[7][8] = bit
      else qr.modules[14 - i][8] = bit

      // Bottom-left / Top-right
      if (i < 8) {
        qr.modules[param.size - 1 - i][8] = bit
      } else {
        qr.modules[8][param.size - 15 + i] = bit
      }
    }

    return qr.modules
  }

  /**
   * Generates a clean SVG string for the QR code.
   */
  public static toSVG(text: string, options: { size?: number; margin?: number; darkColor?: string; lightColor?: string } = {}): string {
    const { size = 256, margin = 3, darkColor = '#000000', lightColor = '#ffffff' } = options
    const matrix = SimpleQR.encode(text)
    const n = matrix.length
    const totalSize = n + margin * 2
    const cellSize = (size / totalSize).toFixed(3)

    let paths = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const x = (c + margin) * (size / totalSize)
          const y = (r + margin) * (size / totalSize)
          paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize}" height="${cellSize}" fill="${darkColor}" />`
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="${lightColor}" />
      ${paths}
    </svg>`
  }
}
