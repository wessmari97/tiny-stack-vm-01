// Tiny stack VM: runs every program in the input dir, writes stdout.bin + exit.txt per id. Full ISA + all ten traps.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INDIR = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUTDIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

function run(prog: Uint8Array, input: Uint8Array): [Uint8Array, number] {
  const S = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let olen = 0;
  let ipos = 0;
  let pc = 0;
  let steps = 0;
  const n = prog.length;
  const end = (code: number): [Uint8Array, number] => [out.subarray(0, olen), code];
  for (;;) {
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = prog[pc];
    let imm = 0;
    let ok = true;
    if (op <= 7) {
      imm = op === 1 ? 1 : op === 2 ? 4 : 0;
    } else if (op >= 16 && op <= 30) {
      // 0x10-0x1e: arithmetic, logic, shifts, NEG, NOT
    } else if (op >= 32 && op <= 34) {
      // 0x20-0x22: EQ, LT, LTU
    } else if (op >= 48 && op <= 52) {
      imm = op === 52 ? 0 : 2; // 0x30-0x33 jumps/call, 0x34 RET
    } else if (op === 64 || op === 65) {
      // LOAD, STORE
    } else if (op >= 80 && op <= 83) {
      // PRINT, PUTC, IN, EXIT
    } else {
      ok = false;
    }
    if (!ok) return end(5);
    if (pc + imm >= n) return end(9);
    steps++;
    const nx = pc + 1 + imm;
    pc = nx;
    if (op >= 16 && op <= 34) {
      // arithmetic / logic / compare block
      if (op === 23) {
        // NEG
        if (sp < 1) return end(2);
        S[sp - 1] = -S[sp - 1] | 0;
      } else if (op === 27) {
        // NOT
        if (sp < 1) return end(2);
        S[sp - 1] = ~S[sp - 1];
      } else {
        if (sp < 2) return end(2);
        const b = S[sp - 1];
        const a = S[sp - 2];
        let r: number;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) {
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 20) {
          if (b === 0) return end(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 21) {
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 22) {
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = a >>> 0 < (b >>> 0) ? 1 : 0;
        sp -= 2;
        S[sp++] = r;
      }
      continue;
    }
    switch (op) {
      case 0:
        return end(0);
      case 1:
        if (sp === 256) return end(3);
        S[sp++] = (prog[nx - 1] << 24) >> 24;
        break;
      case 2:
        if (sp === 256) return end(3);
        S[sp++] = prog[nx - 4] | (prog[nx - 3] << 8) | (prog[nx - 2] << 16) | (prog[nx - 1] << 24);
        break;
      case 3:
        if (sp < 1) return end(2);
        sp--;
        break;
      case 4:
        if (sp < 1) return end(2);
        if (sp === 256) return end(3);
        S[sp] = S[sp - 1];
        sp++;
        break;
      case 5: {
        if (sp < 2) return end(2);
        const t = S[sp - 1];
        S[sp - 1] = S[sp - 2];
        S[sp - 2] = t;
        break;
      }
      case 6:
        if (sp < 2) return end(2);
        if (sp === 256) return end(3);
        S[sp] = S[sp - 2];
        sp++;
        break;
      case 7: {
        if (sp < 3) return end(2);
        const a = S[sp - 3];
        S[sp - 3] = S[sp - 2];
        S[sp - 2] = S[sp - 1];
        S[sp - 1] = a;
        break;
      }
      case 48:
      case 49:
      case 50: {
        const rel = ((prog[nx - 2] | (prog[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) {
          if (sp < 1) return end(2);
          const v = S[--sp];
          take = op === 49 ? v === 0 : v !== 0;
        }
        if (take) pc = nx + rel;
        break;
      }
      case 51:
        if (cp === 64) return end(7);
        C[cp++] = nx;
        pc = prog[nx - 2] | (prog[nx - 1] << 8);
        break;
      case 52:
        if (cp === 0) return end(8);
        pc = C[--cp];
        break;
      case 64: {
        if (sp < 1) return end(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= 256) return end(6);
        S[sp - 1] = M[addr];
        break;
      }
      case 65: {
        if (sp < 2) return end(2);
        const addr = S[sp - 1];
        const v = S[sp - 2];
        if (addr < 0 || addr >= 256) return end(6);
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 80: {
        if (sp < 1) return end(2);
        const s = String(S[sp - 1]);
        if (olen + s.length > 65536) return end(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (sp < 1) return end(2);
        if (olen + 1 > 65536) return end(11);
        out[olen++] = S[--sp] & 255;
        break;
      case 82:
        if (sp === 256) return end(3);
        S[sp++] = ipos < input.length ? input[ipos++] : -1;
        break;
      case 83:
        if (sp < 1) return end(2);
        return end(S[--sp] & 255);
    }
  }
}

for (const id of readdirSync(INDIR).sort()) {
  const [stdout, code] = run(
    readFileSync(join(INDIR, id, "program.bin")),
    readFileSync(join(INDIR, id, "input.bin")),
  );
  mkdirSync(join(OUTDIR, id), { recursive: true });
  writeFileSync(join(OUTDIR, id, "stdout.bin"), stdout);
  writeFileSync(join(OUTDIR, id, "exit.txt"), String(code) + "\n");
}
