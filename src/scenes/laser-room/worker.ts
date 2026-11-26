// Work that would hold the page up for a while (building the smoke's noise, tracing a sign's letters) is done in a
// worker, so scrolling and taps carry on meanwhile. The work is a pure function: everything it uses is inside it, so
// its own source can be sent to a worker as it stands. Where a worker can't be made (or fails), it runs here.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any pure function, keyed by itself
type Pure = (...args: any[]) => unknown;
const workers = new Map<Pure, Worker | null>();
let next = 0;

// the arrays a result holds, handed over rather than copied
const TRANSFER = `(r) => { const out = []; const add = (v) => { if (v && ArrayBuffer.isView(v)) out.push(v.buffer); }; add(r); if (r && typeof r === "object" && !ArrayBuffer.isView(r)) Object.values(r).forEach(add); return out; }`;

function workerFor(fn: Pure): Worker | null {
  let worker = workers.get(fn);
  if (worker !== undefined) return worker;
  try {
    const src = `const run = (${fn.toString()}); const transfer = ${TRANSFER};
self.onmessage = (e) => { try { const r = run(...e.data.args); self.postMessage({ id: e.data.id, r }, transfer(r)); } catch (err) { self.postMessage({ id: e.data.id, error: String(err) }); } };`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    worker = new Worker(url);
    // (not straight away: the worker fetches its script after this returns)
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    worker = null;
  }
  workers.set(fn, worker);
  return worker;
}

/** `fn(...args)` in a worker of its own (one per function, kept), or here if there can't be one */
export function offThread<A extends unknown[], R>(fn: (...args: A) => R, ...args: A): Promise<R> {
  const worker = typeof Worker === "function" ? workerFor(fn) : null;
  if (!worker) return Promise.resolve().then(() => fn(...args));
  const id = ++next;
  return new Promise<R>((resolve) => {
    const done = (e: MessageEvent | Event) => {
      const data = (e as MessageEvent).data as { id?: number; r?: R; error?: string } | undefined;
      if (e.type === "message" && data?.id !== id) return;
      worker.removeEventListener("message", done);
      worker.removeEventListener("error", done);
      // a worker that can't run it (a blocked script, an error) leaves it to this thread, as before
      if (e.type !== "message" || data?.error !== undefined) {
        workers.set(fn, null);
        worker.terminate();
        resolve(fn(...args));
      } else resolve(data!.r as R);
    };
    worker.addEventListener("message", done);
    worker.addEventListener("error", done);
    worker.postMessage({ id, args });
  });
}

/** give the page a turn (a frame can be drawn, input handled) before carrying on */
export function yieldToPage(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
