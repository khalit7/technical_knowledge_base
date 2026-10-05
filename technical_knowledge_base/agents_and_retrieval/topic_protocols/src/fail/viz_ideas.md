# Failure lab: visual ideas (2026-10-05)

Question the tab answers: "I see this error: which layer failed, and what do I run first?"

## Built
1. **Symptom search over recorded outputs** (score high): paste an error, matches title, symptom and every recorded output; highlights the words in the terminal blocks. Teaches that error text is the map to the layer.
2. **Layer and tool filters**: chips for 7 layers and 8 tools (curl, Python, Node fetch, openssl, dig, gRPC, MCP, nginx log).
3. **Case cards with real terminal blocks**: command as run, output unedited, exit status, notes; simulated parts in a red-edged box.
4. **Drill**: shuffled scenario plus first client's output; pick the layer; reveal "check first" and cause; score. Built for the interview goal.
5. **Decision tree**: symptom family, then wording or status, then leaf cases; every case reachable (puppeteer walks every path).
6. **Inline charts from the recorded outputs**: window / RTT (measured dots vs dashed prediction, log-log, with a numbers table), SSE arrival timelines for six proxy configurations (the "all at once" rows), max-concurrent-streams Gantt bars, backend counts for gRPC pinning.

## Rejected
- Animated packet diagrams per failure: the Reading and On the wire tabs own the mechanisms; here the evidence is the terminal output.
- A Nagle latency chart: the effect did not reproduce on macOS loopback (median 0.05 ms either way); a chart of two equal bars would mislead. Kept as text with the measurement.
- Public DNSSEC SERVFAIL demo: the machine's resolver is intercepted (see README).
- A Linux container for real tc netem / Nagle / glibc ndots: Docker is installed but its daemon was not running; starting Docker Desktop on Khalid's machine was out of scope. Would make window_rtt (TCP itself), nagle and ndots fully real.

## What the methodology lacked
No rule for "a reproduction that did not reproduce": shown as a measured negative result with the reason and the source for the expected behaviour.
