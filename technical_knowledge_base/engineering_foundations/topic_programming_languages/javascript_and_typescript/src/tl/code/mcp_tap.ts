// A transport wrapper that records every JSON-RPC message in both directions (for the page's message-flow view).
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export function tap(inner: Transport, log: { dir: "->" | "<-"; msg: JSONRPCMessage }[]): Transport {
  const outer: Transport = {
    start: () => inner.start(),
    close: () => inner.close(),
    send: (msg, opts) => { log.push({ dir: "->", msg }); return inner.send(msg, opts); },
    get sessionId() { return inner.sessionId; },
    setProtocolVersion: (v) => inner.setProtocolVersion?.(v),   // forward everything, or the wrapper changes behaviour
  };
  inner.onmessage = (msg, extra) => { log.push({ dir: "<-", msg }); outer.onmessage?.(msg, extra); };
  inner.onclose = () => outer.onclose?.();
  inner.onerror = (e) => outer.onerror?.(e);
  return outer;
}
