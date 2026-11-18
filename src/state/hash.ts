export type GroupVariant = "boolean" | "frequency";

export interface Group {
  id: number;
  name: string;
  color: number;
  variant?: GroupVariant;
  step?: number;
  years: Record<number, Uint8Array | Uint16Array>;
}

export interface State {
  v: 1;
  nextGroupId: number;
  groups: Group[];
  active: number | null;
  year: number;
  month: number;
}

function writeUVarint(buf: number[], val: number): void {
  val = Math.floor(Math.max(0, val));
  while (val >= 0x80) {
    buf.push((val & 0x7f) | 0x80);
    val >>>= 7;
  }
  buf.push(val & 0x7f);
}

function readUVarint(bytes: Uint8Array, offset: { pos: number }): number {
  let res = 0;
  let shift = 0;
  while (offset.pos < bytes.length) {
    const b = bytes[offset.pos++];
    res |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return res >>> 0;
    shift += 7;
    if (shift > 35) throw new Error("Varint overflow");
  }
  throw new Error("Unexpected EOF reading varint");
}

function zigzag(n: number): number {
  return n >= 0 ? n * 2 : -n * 2 - 1;
}

function unzigzag(n: number): number {
  return n & 1 ? -((n + 1) >>> 1) : n >>> 1;
}

function uvarintLen(val: number): number {
  val = Math.floor(Math.max(0, val));
  let len = 1;
  while (val >= 0x80) {
    len++;
    val >>>= 7;
  }
  return len;
}

export function isDayMarked(
  yearMarks: Uint8Array | Uint16Array | undefined,
  dayIdx: number,
): boolean {
  if (!yearMarks || dayIdx < 0 || dayIdx >= 366) return false;
  if (yearMarks.length === 46) {
    return (yearMarks[dayIdx >> 3] & (1 << (dayIdx & 7))) !== 0;
  }
  return (yearMarks[dayIdx] || 0) > 0;
}

export function getDayValue(
  yearMarks: Uint8Array | Uint16Array | undefined,
  dayIdx: number,
): number {
  if (!yearMarks || dayIdx < 0 || dayIdx >= 366) return 0;
  if (yearMarks.length === 46) {
    return (yearMarks[dayIdx >> 3] & (1 << (dayIdx & 7))) !== 0 ? 1 : 0;
  }
  return yearMarks[dayIdx] || 0;
}

export function setDayMark(
  yearMarks: Uint8Array | Uint16Array,
  dayIdx: number,
  marked: boolean,
): void {
  if (dayIdx < 0 || dayIdx >= 366) return;
  if (yearMarks.length === 46) {
    const byteIdx = dayIdx >> 3;
    const bit = 1 << (dayIdx & 7);
    if (marked) {
      yearMarks[byteIdx] |= bit;
    } else {
      yearMarks[byteIdx] &= ~bit;
    }
  } else {
    yearMarks[dayIdx] = marked ? 1 : 0;
  }
}

export function setDayValue(
  yearMarks: Uint8Array | Uint16Array,
  dayIdx: number,
  val: number,
): void {
  if (dayIdx < 0 || dayIdx >= 366) return;
  if (yearMarks.length === 46) {
    setDayMark(yearMarks, dayIdx, val > 0);
  } else {
    yearMarks[dayIdx] = Math.max(0, Math.floor(val));
  }
}

export function convertGroupToFrequency(group: Group, defaultStep = 1): Group {
  const newYears: Record<number, Uint16Array> = {};
  for (const yStr of Object.keys(group.years)) {
    const y = Number(yStr);
    const oldMarks = group.years[y];
    const freq = new Uint16Array(366);
    if (oldMarks) {
      for (let d = 0; d < 366; d++) {
        if (isDayMarked(oldMarks, d)) {
          freq[d] = 1;
        }
      }
    }
    newYears[y] = freq;
  }
  return {
    ...group,
    variant: "frequency",
    step: group.step || defaultStep,
    years: newYears,
  };
}

export function convertGroupToBoolean(group: Group): Group {
  const newYears: Record<number, Uint8Array> = {};
  for (const yStr of Object.keys(group.years)) {
    const y = Number(yStr);
    const oldMarks = group.years[y];
    const bitset = new Uint8Array(46);
    if (oldMarks) {
      for (let d = 0; d < 366; d++) {
        const val = getDayValue(oldMarks, d);
        if (val >= 1) {
          setDayMark(bitset, d, true);
        }
      }
    }
    newYears[y] = bitset;
  }
  return {
    ...group,
    variant: "boolean",
    years: newYears,
  };
}

function toRuns(
  yearMarks: Uint8Array | Uint16Array,
  maxDays = 366,
): [start: number, len: number][] {
  const runs: [start: number, len: number][] = [];
  let inRun = false;
  let start = 0;
  for (let d = 0; d < maxDays; d++) {
    if (isDayMarked(yearMarks, d)) {
      if (!inRun) {
        inRun = true;
        start = d;
      }
    } else {
      if (inRun) {
        inRun = false;
        runs.push([start, d - start]);
      }
    }
  }
  if (inRun) {
    runs.push([start, maxDays - start]);
  }
  return runs;
}

export function hasAnyMarks(
  yearMarks: Uint8Array | Uint16Array | undefined,
): boolean {
  if (!yearMarks) return false;
  for (let i = 0; i < yearMarks.length; i++) {
    if (yearMarks[i] !== 0) return true;
  }
  return false;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function serializeBinary(state: State): Uint8Array {
  const buf: number[] = [];
  buf.push(0x43, 0x4e);

  const hasFrequency = state.groups.some((g) => g.variant === "frequency");
  const version = hasFrequency ? 2 : 1;
  writeUVarint(buf, version);

  const baselineYear = state.year;
  writeUVarint(buf, baselineYear);
  writeUVarint(buf, state.nextGroupId);
  writeUVarint(buf, state.active === null ? 0 : state.active + 1);
  writeUVarint(buf, zigzag(state.year - baselineYear));
  writeUVarint(buf, state.month);
  writeUVarint(buf, state.groups.length);

  const textEncoder = new TextEncoder();
  for (const g of state.groups) {
    writeUVarint(buf, g.id);
    const nameBytes = textEncoder.encode(g.name);
    writeUVarint(buf, nameBytes.length);
    for (let i = 0; i < nameBytes.length; i++) {
      buf.push(nameBytes[i]);
    }
    writeUVarint(buf, g.color);

    const isFreq = g.variant === "frequency";
    if (version >= 2) {
      writeUVarint(buf, isFreq ? 1 : 0);
      writeUVarint(buf, Math.max(1, g.step || 1));
    }

    const activeYears = Object.keys(g.years)
      .map(Number)
      .filter((y) => hasAnyMarks(g.years[y]))
      .sort((a, b) => a - b);

    writeUVarint(buf, activeYears.length);
    for (const y of activeYears) {
      writeUVarint(buf, zigzag(y - baselineYear));
      const marks = g.years[y];

      if (isFreq || (marks && marks.length > 46)) {
        const nonZero: [number, number][] = [];
        for (let d = 0; d < 366; d++) {
          const val = getDayValue(marks, d);
          if (val > 0) nonZero.push([d, val]);
        }
        writeUVarint(buf, 2);
        writeUVarint(buf, nonZero.length);
        let prevD = 0;
        for (const [d, val] of nonZero) {
          writeUVarint(buf, d - prevD);
          writeUVarint(buf, val);
          prevD = d;
        }
      } else {
        const runs = toRuns(marks);
        let rleSize = uvarintLen(runs.length);
        for (const [start, len] of runs) {
          rleSize += uvarintLen(start) + uvarintLen(len - 1);
        }

        if (rleSize < 46) {
          writeUVarint(buf, 1);
          writeUVarint(buf, runs.length);
          for (const [start, len] of runs) {
            writeUVarint(buf, start);
            writeUVarint(buf, len - 1);
          }
        } else {
          writeUVarint(buf, 0);
          for (let i = 0; i < 46; i++) {
            buf.push(marks[i] ?? 0);
          }
        }
      }
    }
  }

  return new Uint8Array(buf);
}

function deserializeBinary(bytes: Uint8Array): State {
  if (bytes.length < 2 || bytes[0] !== 0x43 || bytes[1] !== 0x4e) {
    throw new Error("Invalid magic bytes");
  }
  const offset = { pos: 2 };
  const version = readUVarint(bytes, offset);
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported state version: ${version}`);
  }

  const baselineYear = readUVarint(bytes, offset);
  const nextGroupId = readUVarint(bytes, offset);
  const activeEnc = readUVarint(bytes, offset);
  const active = activeEnc === 0 ? null : activeEnc - 1;
  const yearDelta = unzigzag(readUVarint(bytes, offset));
  const year = baselineYear + yearDelta;
  const month = readUVarint(bytes, offset);
  const groupCount = readUVarint(bytes, offset);

  const textDecoder = new TextDecoder();
  const groups: Group[] = [];
  for (let gi = 0; gi < groupCount; gi++) {
    const id = readUVarint(bytes, offset);
    const nameLen = readUVarint(bytes, offset);
    if (offset.pos + nameLen > bytes.length) {
      throw new Error("Truncated group name bytes");
    }
    const nameBytes = bytes.slice(offset.pos, offset.pos + nameLen);
    offset.pos += nameLen;
    const name = textDecoder.decode(nameBytes);
    const color = readUVarint(bytes, offset);

    let variant: GroupVariant = "boolean";
    let step = 1;
    if (version >= 2) {
      const vCode = readUVarint(bytes, offset);
      variant = vCode === 1 ? "frequency" : "boolean";
      step = Math.max(1, readUVarint(bytes, offset));
    }

    const yearCount = readUVarint(bytes, offset);
    const years: Record<number, Uint8Array | Uint16Array> = {};

    for (let yi = 0; yi < yearCount; yi++) {
      const yDelta = unzigzag(readUVarint(bytes, offset));
      const y = baselineYear + yDelta;
      const mode = readUVarint(bytes, offset);

      if (mode === 0) {
        if (offset.pos + 46 > bytes.length) {
          throw new Error("Truncated bitset data");
        }
        const marks = new Uint8Array(46);
        marks.set(bytes.slice(offset.pos, offset.pos + 46));
        offset.pos += 46;
        years[y] = marks;
      } else if (mode === 1) {
        const marks = new Uint8Array(46);
        const runCount = readUVarint(bytes, offset);
        for (let ri = 0; ri < runCount; ri++) {
          const start = readUVarint(bytes, offset);
          const lenMinusOne = readUVarint(bytes, offset);
          const len = lenMinusOne + 1;
          for (let d = start; d < start + len && d < 366; d++) {
            setDayMark(marks, d, true);
          }
        }
        years[y] = marks;
      } else if (mode === 2) {
        const marks = new Uint16Array(366);
        const entryCount = readUVarint(bytes, offset);
        let currD = 0;
        for (let ei = 0; ei < entryCount; ei++) {
          const delta = readUVarint(bytes, offset);
          currD += delta;
          const val = readUVarint(bytes, offset);
          if (currD < 366) {
            marks[currD] = val;
          }
        }
        years[y] = marks;
      } else {
        throw new Error(`Unknown year mode: ${mode}`);
      }
    }

    groups.push({ id, name, color, variant, step, years });
  }

  return {
    v: 1,
    nextGroupId,
    groups,
    active,
    year,
    month,
  };
}

async function compressDeflateRaw(
  bytes: Uint8Array,
): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Response(bytes as unknown as BodyInit).body?.pipeThrough(
      new CompressionStream("deflate-raw"),
    );
    if (!stream) return null;
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(
  bytes: Uint8Array,
): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Response(bytes as unknown as BodyInit).body?.pipeThrough(
      new DecompressionStream("deflate-raw"),
    );
    if (!stream) return null;
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function encodeHash(state: State): Promise<string> {
  const rawBytes = serializeBinary(state);
  const compBytes = await compressDeflateRaw(rawBytes);
  const hasFrequency = state.groups.some((g) => g.variant === "frequency");
  const prefix = hasFrequency ? "v2" : "v1";

  if (compBytes && compBytes.length < rawBytes.length) {
    return `#${prefix}c.${bytesToBase64Url(compBytes)}`;
  }
  return `#${prefix}r.${bytesToBase64Url(rawBytes)}`;
}

export async function decodeHash(hash: string): Promise<State | null> {
  if (!hash) return null;
  let str = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!str) return null;

  try {
    if (str.startsWith("v1c.") || str.startsWith("v2c.")) {
      const b64 = str.slice(4);
      const compBytes = base64UrlToBytes(b64);
      const decompBytes = await decompressDeflateRaw(compBytes);
      if (!decompBytes) return null;
      return deserializeBinary(decompBytes);
    }
    if (str.startsWith("v1r.") || str.startsWith("v2r.")) {
      const b64 = str.slice(4);
      const rawBytes = base64UrlToBytes(b64);
      return deserializeBinary(rawBytes);
    }
    return null;
  } catch {
    return null;
  }
}

export function areStatesEqual(a: State, b: State): boolean {
  if (a.v !== b.v) return false;
  if (a.groups.length !== b.groups.length) return false;
  const binA = serializeBinary(a);
  const binB = serializeBinary(b);
  if (binA.length !== binB.length) return false;
  for (let i = 0; i < binA.length; i++) {
    if (binA[i] !== binB[i]) return false;
  }
  return true;
}
