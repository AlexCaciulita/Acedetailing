/* Minimal QR Code encoder — byte mode, error-correction level M, versions 1–10.
   That covers 271 bytes, far beyond any /vin/<cod> URL.

   Written out rather than pulled from npm because the site ships zero runtime
   dependencies and a printed record has to keep working without a CDN. Follows
   ISO/IEC 18004; structure mirrors the well-known reference implementations.

   encodeQr(text) -> { size, modules }  where modules[row][col] is a boolean. */

/* ── GF(256), primitive polynomial 0x11D ─────────────────────────────────── */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], EXP[i]);
        }
        poly = next;
    }
    return poly;
}

function rsRemainder(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const buf = new Uint8Array(data.length + ecLen);
    buf.set(data);
    for (let i = 0; i < data.length; i++) {
        const factor = buf[i];
        if (factor === 0) continue;
        for (let j = 0; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], factor);
    }
    return buf.slice(data.length);
}

/* ── Version tables (EC level M) ─────────────────────────────────────────────
   [ecPerBlock, group1Blocks, group1DataCw, group2Blocks, group2DataCw] */

const EC_M = {
    1:  [10, 1, 16, 0, 0],
    2:  [16, 1, 28, 0, 0],
    3:  [26, 1, 44, 0, 0],
    4:  [18, 2, 32, 0, 0],
    5:  [24, 2, 43, 0, 0],
    6:  [16, 4, 27, 0, 0],
    7:  [18, 4, 31, 0, 0],
    8:  [22, 2, 38, 2, 39],
    9:  [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44]
};

const ALIGN_POS = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

const dataCapacityCw = (version) => {
    const [, g1, d1, g2, d2] = EC_M[version];
    return g1 * d1 + g2 * d2;
};

/* ── BCH bit strings ─────────────────────────────────────────────────────── */

function formatBits(mask) {
    // EC level M is 0b00; the 5 data bits are (level << 3) | mask.
    const data = mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
}

function versionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | rem;
}

/* ── Bit stream ──────────────────────────────────────────────────────────── */

class BitBuffer {
    constructor() { this.bits = []; }
    push(value, length) {
        for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    get length() { return this.bits.length; }
}

function toBytes(text) {
    // Byte mode is defined over ISO-8859-1, but QR readers universally treat the
    // payload as UTF-8, which is also what a URL needs.
    return new TextEncoder().encode(text);
}

function buildCodewords(bytes, version) {
    const capacityBits = dataCapacityCw(version) * 8;
    const buf = new BitBuffer();

    buf.push(0b0100, 4);                                   // byte mode
    buf.push(bytes.length, version <= 9 ? 8 : 16);         // character count
    for (const b of bytes) buf.push(b, 8);

    // Terminator, then pad to a byte boundary, then alternating pad bytes.
    buf.push(0, Math.min(4, capacityBits - buf.length));
    while (buf.length % 8 !== 0) buf.push(0, 1);

    const codewords = [];
    for (let i = 0; i < buf.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | buf.bits[i + j];
        codewords.push(byte);
    }
    for (let pad = 0xec; codewords.length < dataCapacityCw(version); pad ^= 0xec ^ 0x11) {
        codewords.push(pad);
    }
    return codewords;
}

function interleave(codewords, version) {
    const [ecLen, g1, d1, g2, d2] = EC_M[version];

    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < g1 + g2; i++) {
        const size = i < g1 ? d1 : d2;
        const block = codewords.slice(offset, offset + size);
        offset += size;
        dataBlocks.push(block);
        ecBlocks.push(rsRemainder(Uint8Array.from(block), ecLen));
    }

    const result = [];
    const maxData = Math.max(d1, d2);
    for (let i = 0; i < maxData; i++) {
        for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecLen; i++) {
        for (const block of ecBlocks) result.push(block[i]);
    }
    return result;
}

/* ── Matrix ──────────────────────────────────────────────────────────────── */

function createMatrix(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

    const setFn = (r, c, dark) => {
        modules[r][c] = dark;
        reserved[r][c] = true;
    };

    // Finder patterns + separators
    for (const [fr, fc] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const rr = fr + r;
                const cc = fc + c;
                if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
                const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6))
                    || (c >= 0 && c <= 6 && (r === 0 || r === 6));
                const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                setFn(rr, cc, inRing || inCore);
            }
        }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        setFn(6, i, i % 2 === 0);
        setFn(i, 6, i % 2 === 0);
    }

    // Alignment patterns, skipping the three that would sit on finders
    const positions = ALIGN_POS[version];
    for (const r of positions) {
        for (const c of positions) {
            const onFinder = (r === 6 && c === 6)
                || (r === 6 && c === size - 7)
                || (r === size - 7 && c === 6);
            if (onFinder) continue;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const ring = Math.max(Math.abs(dr), Math.abs(dc));
                    setFn(r + dr, c + dc, ring !== 1);
                }
            }
        }
    }

    // Format-info area (values written later) + the permanent dark module
    for (let i = 0; i < 9; i++) {
        if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; }
    }
    for (let i = 0; i < 8; i++) {
        reserved[8][size - 1 - i] = true;
        reserved[size - 1 - i][8] = true;
    }
    reserved[8][6] = true;
    reserved[6][8] = true;
    setFn(size - 8, 8, true);

    // Version info area (v >= 7)
    if (version >= 7) {
        const bits = versionBits(version);
        for (let i = 0; i < 18; i++) {
            const dark = ((bits >>> i) & 1) === 1;
            const a = Math.floor(i / 3);
            const b = (i % 3) + size - 11;
            setFn(b, a, dark);
            setFn(a, b, dark);
        }
    }

    return { size, modules, reserved };
}

function placeData(matrix, codewords) {
    const { size, modules, reserved } = matrix;
    const bits = [];
    for (const cw of codewords) {
        for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
    }

    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;                       // skip the timing column
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const col = right - j;
                const upward = ((right + 1) & 2) === 0;
                const row = upward ? size - 1 - vert : vert;
                if (!reserved[row][col] && i < bits.length) {
                    modules[row][col] = bits[i] === 1;
                    i++;
                }
            }
        }
    }
    return i;
}

const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function applyMask(matrix, maskIndex) {
    const { size, modules, reserved } = matrix;
    const fn = MASKS[maskIndex];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!reserved[r][c] && fn(r, c)) modules[r][c] = !modules[r][c];
        }
    }
}

function writeFormat(matrix, maskIndex) {
    const { size, modules } = matrix;
    const bits = formatBits(maskIndex);
    const bit = (i) => ((bits >>> i) & 1) === 1;

    // First copy wraps the top-left finder: bits 0-5 run DOWN column 8, then the
    // corner, then bits 9-14 run LEFT along row 8.
    for (let i = 0; i <= 5; i++) modules[i][8] = bit(i);
    modules[7][8] = bit(6);
    modules[8][8] = bit(7);
    modules[8][7] = bit(8);
    for (let i = 9; i < 15; i++) modules[8][14 - i] = bit(i);

    // Second copy: bits 0-7 run LEFT along row 8 from the right edge; bits 8-14
    // run DOWN column 8 from row size-7, leaving the permanent dark module at
    // (size-8, 8) untouched.
    for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = bit(i);
}

function penalty(matrix) {
    const { size, modules } = matrix;
    let score = 0;

    // Rule 1 — runs of five or more same-coloured modules
    for (let r = 0; r < size; r++) {
        for (const horizontal of [true, false]) {
            let run = 1;
            let prev = horizontal ? modules[r][0] : modules[0][r];
            for (let i = 1; i < size; i++) {
                const cur = horizontal ? modules[r][i] : modules[i][r];
                if (cur === prev) {
                    run++;
                    if (run === 5) score += 3;
                    else if (run > 5) score += 1;
                } else {
                    run = 1;
                    prev = cur;
                }
            }
        }
    }

    // Rule 2 — 2x2 blocks of one colour
    for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
            const v = modules[r][c];
            if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
                score += 3;
            }
        }
    }

    // Rule 3 — finder-like 1:1:3:1:1 patterns with four light modules beside
    const PATTERN = [true, false, true, true, true, false, true];
    const matches = (get, i) => {
        for (let k = 0; k < 7; k++) if (get(i + k) !== PATTERN[k]) return false;
        return true;
    };
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            for (const horizontal of [true, false]) {
                const get = (i) => {
                    const rr = horizontal ? r : i;
                    const cc = horizontal ? i : c;
                    if (rr < 0 || rr >= size || cc < 0 || cc >= size) return false;
                    return modules[rr][cc];
                };
                const start = horizontal ? c : r;
                if (start + 7 > size) continue;
                if (!matches(get, start)) continue;
                const clearBefore = [1, 2, 3, 4].every((k) => !get(start - k));
                const clearAfter = [7, 8, 9, 10].every((k) => !get(start + k));
                if (clearBefore || clearAfter) score += 40;
            }
        }
    }

    // Rule 4 — deviation from a 50/50 dark ratio
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (modules[r][c]) dark++;
    const percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return score;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export function encodeQr(text) {
    const bytes = toBytes(text);

    let version = 0;
    for (let v = 1; v <= 10; v++) {
        const headerBits = 4 + (v <= 9 ? 8 : 16);
        if (dataCapacityCw(v) * 8 >= headerBits + bytes.length * 8) { version = v; break; }
    }
    if (!version) throw new Error('Textul depășește capacitatea suportată (versiunea 10).');

    const codewords = interleave(buildCodewords(bytes, version), version);

    let best = null;
    for (let mask = 0; mask < 8; mask++) {
        const matrix = createMatrix(version);
        placeData(matrix, codewords);
        applyMask(matrix, mask);
        writeFormat(matrix, mask);
        const score = penalty(matrix);
        if (!best || score < best.score) best = { score, matrix, mask };
    }

    return { size: best.matrix.size, modules: best.matrix.modules, version, mask: best.mask };
}

/* Renders as one <path>: far fewer nodes than a rect per module, and it scales
   losslessly on paper. `quiet` is the mandatory 4-module quiet zone. */
export function qrSvg(text, { quiet = 4, className = '', title = '' } = {}) {
    const { size, modules } = encodeQr(text);
    const total = size + quiet * 2;

    let d = '';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (modules[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
        }
    }

    // xmlns is required for the markup to stay valid once it leaves the HTML
    // parser — saved to a file, opened as an image, or embedded in a PDF.
    return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="${title}">
        <rect width="${total}" height="${total}" fill="#ffffff"/>
        <path d="${d}" fill="#000000"/>
    </svg>`;
}
