# Visualisation ideas: Agent security (DEFENSIVE ONLY, revised 2026-10-06)

The page was first built with offensive demonstrations (recorded injection runs against models, an exfiltration
before/after that enumerated bypass channels, a gate "probe" re-run on exfiltration commands). After a safety stop,
Khalid set the scope to DEFENSIVE ONLY. The ideas below are the rebuilt, compliant set; the removed ones are listed
under "Rejected / removed" with the reason.

## Built (defensive)
1. **Permission gate decisions (tab + inline animation).** The root's real `check()` run with no model on the root's
   approved fixed action set (`src/loop/gate_cases.json`, reused verbatim): the task's own work plus a few
   clearly-dangerous actions. A "depends on" column classifies each verdict (allow rule / named deny rule /
   fail-closed default). Earns its place: it makes the central lesson countable (of 7 denials, 4 rest on a named rule
   and 3 on the fail-closed default), which a paragraph cannot. Inline, a 6-step animation steps the gate through a
   representative subset with a caption per step. No attacker framing: it shows a control deciding, no model involved.
2. **Egress allow-list animation (inline, section 4).** A destination allow-list (`sec/egress_policy.py`, a pure
   function, no network) decides ordinary outbound traffic request by request: the model API and package registry
   pass; an unlisted host, a raw IP, and an unlisted DNS name are denied by default. Running counters for allowed and
   denied. Teaches that egress is decided by destination (not by tool), default-deny, and covers DNS, which no attack
   is needed to show.
3. **Seatbelt sandbox before/after (inline toggle, section 3).** A benign command opens a local socket and writes a
   file, outside the sandbox vs under a `(deny network*)` / write-confined profile, with the real measured results.
   The only bytes sent are a fixed marker. Teaches the kernel boundary the gate cannot give. Real `sandbox-exec` runs
   on this machine, benign throughout.
4. **Lethal trifecta checker (inline, section 7).** Three checkboxes; the verdict flips between "exfiltration possible"
   and "chain broken, missing leg X". Pure logic, no model, no attack.
5. **Defence-in-depth simulator (tab).** A no-model design tool: toggle the four controls (gate, sandbox, egress
   allow-list, credential isolation) and see which leg of the trifecta each removes and whether a compromised agent
   could still exfiltrate, with each enabled control linking to where the page shows it working on a benign action.
   Replaces the removed injection lab; it teaches the same operational lesson (name the leg you removed) as a design
   exercise rather than by staging an attack.

## Rejected / removed
- **Recorded indirect-injection runs against models and Claude Code (old "Injection lab" tab).** Removed: crafting and
  recording an injection attack against a model or harness is outside the defensive scope, and you learn nothing
  durable from one model's behaviour against one phrasing. Replaced by conceptual teaching sourced from OWASP LLM01
  and Willison, plus the explicit note on the page about why no injection is run.
- **An "exfiltration, two worlds" before/after that walked read-the-secret then several send-it-out channels, with a
  counterfactual leak counter.** Removed: it enumerated bypass techniques, which a defensive page must not ship.
  Replaced by the destination allow-list animation, which teaches the value of the control without modelling an attack.
- **A gate `gate_probe.py` re-run on exfiltration commands with an "egress-bypass" family.** Removed: re-recording the
  gate against crafted exfiltration is a bypass test. Replaced by reusing the root's approved `gate_cases.json`.
- **An allow-all exfiltration harness that actually leaks a canary.** Rejected at first build and permanently out of
  scope: building a harness whose purpose is to remove a control and complete an exfiltration is exactly what a
  defensive page must not do.
- **A live in-page "attack console".** Rejected: an injection toy, not a teaching aid.
- **A full kernel-syscall trace of the sandbox.** Belongs on Containers and isolation, which owns the OS mechanics.
- **A map of specific CVEs / vendor incidents.** Only the OpenAI DNS incident has a first-party, dated post-mortem;
  listing unverified demonstrations would violate the "verified, dated" rule. Kept to the one solid incident plus the
  OWASP taxonomy and the trifecta framing.

## What the methodology lacked for this page
The methodology assumes visuals reproduce published figures. A defensive security page's best "visual" is a control
succeeding on a benign action (the socket refused, the unlisted destination denied, the out-of-tree write blocked) and
a policy decision made with no model. The honest move is to compute every verdict from real code on benign inputs and
to teach the attack conceptually, never to stage a successful attack for drama.
