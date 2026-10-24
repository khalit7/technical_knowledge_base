"""Fill src/ledger.json labels and keys for the 2026-10-24 rebuild (run once after ledger.py init)."""
import json
C, D, F, V = "core", "depth", "fat", "volatile"
L = {
1:(C,"talking to it in JSON lines"),2:(C,"0.2.163 (Python) and 0.3.291 (TypeScript)"),3:(F,"header time, now in the standard format"),4:(F,"tab names"),5:(F,"nav"),
6:(C,"does not reimplement Claude Code"),7:(F,"merged into 6"),8:(C,"starts the Claude Code binary as a child process"),9:(C,"taught from zero on"),10:(C,"This page owns the library"),
11:(C,"Keep one process open across several turns"),12:(C,"served by an MCP server that lives inside your process"),13:(C,"Everything else, the loop, the context"),14:(C,"defaults are not safe defaults"),15:(C,'is not "done"'),
16:(F,"heading fragment"),17:(C,"Claude Code is a terminal program"),18:(C,"a support bot, a code-review job"),19:(C,"29 September 2025"),20:(V,"MIT licence for the Python wrapper"),
21:(C,"225,167,728 bytes"),22:(D,"on the PATH, then a few fixed install locations"),23:(C,"CLAUDE_CODE_ENTRYPOINT=sdk-py"),24:(C,"One agent session maps to one subprocess"),25:(C,"30 lines down stdin, 53 up stdout"),
26:(C,"replays all 83 lines"),27:(C,"Two kinds of lines share the pipe"),28:(C,"are the conversation"),29:(C,"that echoes it"),30:(C,"a JSON-RPC message for an MCP server inside your process"),
31:(C,"28 questions in 15.8 seconds"),32:(C,"in the critical path of every tool call"),33:(C,"your process sees them only as messages"),34:(C,"the SDK passes a flag"),35:(D,"hooks are middleware"),
36:(D,"How many Claude Code processes are running?"),37:(F,"merged into 36"),38:(D,"Fifty: one per session"),39:(D,"a floor, not the ceiling"),40:(D,"where an agent is an object in your process"),
41:(C,"yields messages until the result"),42:(C,"streaming input"),43:(C,"the preferred way"),44:(C,"one-message iterator"),45:(D,"RateLimitEvent"),
46:(C,"is not stateless"),47:(C,"15 session transcripts"),48:(C,"persistSession: false"),49:(C,"receive_response()"),50:(C,"resumed and forked the saved session"),
51:(C,"the part that phase added"),52:(C,"a new one after the fork"),53:(C,"the history lives in the Claude Code process"),54:(C,"2,572 tokens"),55:(C,"error_during_execution"),
56:(C,"49 fields in Python 0.2.163"),57:(D,"--fallback-model"),58:(D,"--include-hook-events"),59:(C,'sends --system-prompt ""'),60:(C,"no longer uses Claude Code's system prompt by default"),
61:(C,"ours had 29 tools"),62:(C,"matching the CLI"),63:(D,"was briefly changed"),64:(D,"Python 0.1.59 and earlier"),65:(C,"Outside MCP servers: allowed"),
66:(C,"read regardless of settingSources"),67:(F,"pointer to section 9, now a sentence with the number"),68:(C,"passes only isolation"),69:(F,"question restated by the figure"),70:(C,"6 of its 16 tool calls were refused"),
71:(C,"so ask became deny"),72:(C,"Please approve the file edits"),73:(C,"Tests after: 2 failed"),74:(C,"247,863 input tokens"),75:(C,"and run your own test"),
76:(C,"makes an allow-list exact"),77:(C,"the order in which these are consulted"),78:(C,"where it runs decides what it can touch"),79:(C,"1 to 5 ms for the file tools"),80:(C,"no port"),
81:(C,"258 tokens of context"),82:(C,"The MCP protocol itself is taught on"),83:(D,"are metadata, not enforcement"),84:(C,"Every tool call passes a permission check"),85:(C,"even in bypassPermissions mode"),
86:(C,"Auto-approved tools never reach"),87:(C,"--permission-prompt-tool stdio"),88:(C,"stages after it never ran"),89:(D,"PermissionResultDeny"),90:(C,"tests/ is read-only for this agent"),
91:(C,"did not try another route"),92:(C,"the test file was unchanged"),93:(C,"so the process can exit and the session resume later"),94:(C,"gives each function an id"),95:(C,"can replace the tool's output"),
96:(C,"run concurrently"),97:(D,"PostToolUseFailure, UserPromptSubmit"),98:(C,"which also run if"),99:(C,"a hook that blocks"),100:(C,"passes any rule written about file paths"),
101:(C,"Firecracker VMs"),102:(C,"Gate and sandbox design are taught on"),103:(C,"an alias kept for compatibility"),104:(C,"AgentDefinition(...)"),105:(C,"20 concurrent subagents"),
106:(C,"maxTurns=4"),107:(C,"matches the command it names, not its relatives"),108:(C,"stopped at its 4-turn limit"),109:(F,"merged into 108"),110:(C,"disabled for this session"),
111:(C,'reported "0 failed"'),112:(C,"Haiku $0.0228"),113:(C,"33,906 input tokens"),114:(C,"Counts only the top-level agent loop"),115:(D,"forward_subagent_text=True"),
116:(C,"48-module audit"),117:(C,"the saved conversation of one Claude Code process"),118:(C,"continue_conversation=True"),119:(C,"a fresh container can resume a session written by another"),120:(C,"a long session compacts as Claude Code does"),
121:(C,"the undo button"),122:(C,"replay-user-messages"),123:(C,"Bash changes and subagent edits are not tracked"),124:(C,"457-byte backup"),125:(C,"Rewinding restores files, not the conversation"),
126:(D,"plus four inline test scripts"),127:(D,"contains multiple operations"),128:(D,"The run cost $0.0773"),129:(C,"asks for a final answer that matches a JSON schema"),130:(C,"adds a tool named"),
131:(C,"error_max_structured_output_retries"),132:(C,"tests_passing"),133:(C,"cost 181 tokens"),134:(C,"a hidden output tool in Pydantic AI"),135:(C,"cache read and cache write tokens, and a cost"),
136:(C,"not authoritative billing data"),137:(C,"nothing is billed per token"),138:(C,"match only at the 5-minute price"),139:(C,"One model call arrives as several messages"),140:(C,"streamed 15"),
141:(C,"1 to 3 tokens in s1"),142:(C,"916 input tokens"),143:(C,"a session-title request is our guess"),144:(C,"Caching follows Claude Code's rules"),145:(C,"226,443 cached tokens"),
146:(C,"1-hour cache entries"),147:(C,"How the prefix is placed"),148:(C,"stop after the call that crosses them"),149:(C,"connected apps as MCP tools"),150:(C,"no tool or server name was stored anywhere"),
151:(C,"fresh + cache write + cache read"),152:(C,"minutes apart"),153:(C,"$0.257 at list prices"),154:(C,"165 tools in batch 2"),155:(C,"We did not find out more than that"),
156:(C,"(3 of 3)"),157:(C,"met the same pitfall in its first SDK run"),158:(F,"heading fragment"),159:(C,"CLAUDE_CODE_USE_ANTHROPIC_AWS=1"),160:(C,"Anthropic does not allow third party developers"),
161:(C,"Use the API key authentication methods"),162:(C,"invoice and receipt extraction"),163:(C,"Do not rely on default"),164:(C,"does not produce telemetry of its own"),165:(D,"45 of 45"),
166:(C,"6 model calls, $0.0247"),167:(C,"the context belongs to the binary, not to the language"),168:(C,"env replaces the child's environment"),169:(C,"public beta since 8 April 2026"),170:(C,"Most of the migration is mapping SDK configuration objects"),
171:(D,"persisted and versioned server-side"),172:(D,"Small primitives in your process"),173:(C,"Choose the Claude Agent SDK"),174:(C,"Choose a typed loop"),175:(D,"last edited 22 Sep 2026"),
176:(F,"table intro"),177:(C,"says the loop ended normally, not that the task was done"),178:(F,"restates the s3 drill"),179:(F,"restates the s3 drill"),180:(C,"128,306"),
181:(C,"A service-ready start passes"),182:(F,"restates the system prompt default"),183:(C,"7,612 against 1,388"),184:(C,"a callback is not an audit log"),185:(C,"which runs for every call"),
186:(D,"plus four inline test scripts"),187:(C,"a tool of your own"),188:(C,"take differences, never sums"),189:(C,"Do not bill end users"),190:(F,"restates query() is not stateless"),
191:(C,"data-retention question"),192:(C,"--no-session-persistence"),193:(C,"Unless previously approved"),194:(D,"How does the Claude Agent SDK call your Python tool"),195:(D,"MCP server of type sdk"),
196:(D,"No socket, no extra process"),197:(F,"interview question restating section 5"),198:(F,"restates section 5"),199:(F,"restates section 5"),200:(D,"reports success but did nothing"),
201:(D,"and tool list, whether anything answers"),202:(F,"interview question restating section 9"),203:(C,"the difference of consecutive totals"),204:(F,"restates section 9"),205:(F,"question; answers kept in section 10 blocks"),
206:(D,"you need neither your own control flow nor provider choice"),207:(D,"Pick the SDK over Managed Agents"),208:(D,"How do you isolate tenants"),209:(D,"credentials injected by a proxy"),210:(C,"Sources are linked where each fact is used"),
211:(C,"8 runs plus 6 counting calls"),212:(C,"fate of each claim in"),213:(C,"Every line that crossed the pipe"),214:(C,"only 2 of them from your process"),215:(C,"src/code/wire.py"),
216:(D,"thinking-progress and session-state notices"),217:(C,"Times are seconds since the stand-in started"),218:(D,"hook callback ids per event and matcher"),219:(D,"Control a running session"),220:(D,"implementation detail that may change between versions"),
221:(C,"Pick options as you would write them"),222:(C,"rebuilt from"),223:(C,"checks its rebuilt command"),224:(C,"newer Claude Code added 176 tokens"),225:(C,"same options in camelCase"),
226:(C,"two planted bugs"),227:(C,"fresh copy of the repository"),228:(C,"model-written em-dashes were replaced by commas"),229:(C,"the full redacted copies are in"),230:(C,"Six one-turn calls"),
231:(C,"Session files the runs left behind"),232:(F,"Wire lab card: the lab moved into Reading section 1"),233:(C,"checked against five recorded commands"),234:(C,"All eight runs"),235:(C,"Workflows against agents, the orchestration schools"),
236:(C,"Same agent, six ways (this SDK next to"),237:(C,"the other way to get durable, resumable agents"),238:(C,"when the subagents of section 6 pay"),239:(C,"TRACEPARENT and the identity attributes"),240:(C,"the libraries this SDK is compared with"),
241:(C,"the layer that sits between an agent"),242:(C,"Mem0, Graphiti, Letta"),243:(C,"The process this SDK starts"),244:(C,"23 harnesses compared"),245:(C,"Tool calling at the API level"),
246:(C,"Window budgets, cache placement"),247:(C,"what a callback cannot do"),248:(C,"Harnesses as RL environments"),249:(C,"The protocol behind in-process and external tools"),250:(C,"Namespaces, seccomp, gVisor, microVMs"),
251:(C,"The reason-act loop"),252:(C,"the comparison with Claude Code, the Client SDK"),253:(C,"The six-step order, modes, callbacks"),254:(C,"Session patterns, sizing, tenant isolation"),255:(C,"deduplication, caching"),
256:(C,"Every option and message type"),257:(C,"are short and worth reading"),258:(C,"gather-context, take-action, verify-work"),259:(C,"option-by-option mapping"),260:(C,"when to use neither"),
261:(C,"Most of it applies to SDK agents"),262:(C,"The main comparison point"),
}
EXTRA = [  # units drawn by script on the old page (the claim table, bars, figures), added by hand
 ("t-read","old page claim by claim",D,"It drives a bundled Claude Code binary as a child process over JSON lines","Old claim: packages the harness as a library: partly"),
 ("t-read","old page claim by claim",D,"Claude Code searches with Bash","Old claim: glob/grep in the tool suite: partly"),
 ("t-read","old page claim by claim",D,"Each call writes a session file and can be resumed","Old claim: query() stateless: wrong"),
 ("t-read","old page claim by claim",D,"TypeScript has no client class","Old claim: ClaudeSDKClient or streaming sessions: holds"),
 ("t-read","old page claim by claim",D,"the auto permission policy came on 10 September 2026","Old claim: Managed Agents since September 2026: wrong"),
 ("t-read","old page claim by claim",D,"ant beta:sessions connect","Old claim: a beta command attaches a terminal: holds"),
 ("t-read","old page claim by claim",D,"canUseTool sees only calls nothing earlier settled","Old claim: permissions: partly"),
 ("t-read","old page claim by claim",D,"the skills option filters them","Old claim: skills body on demand: holds"),
 ("t-read","old page claim by claim",D,"Python callbacks cover 10 events and not SessionStart","Old claim: hooks incl. SessionStart: partly"),
 ("t-read","old page claim by claim",D,"validated and retried","Old claim: structured output prompt-level: wrong"),
 ("t-read","old page claim by claim",D,"Redirects to code.claude.com/docs/en/agent-sdk/overview","Old docs link: updated"),
 ("t-read","old page claim by claim",D,"successor of Swarm","Old claim: OpenAI Agents SDK summary: holds"),
 ("t-read","old page claim by claim",D,"give your agents a computer","Old claim: core bet is a computer: holds"),
 ("t-read","cost",C,"Every one reproduces exactly","Cost bars: each run's total reproduced from tokens x list prices"),
 ("t-read","cost",C,"122 tools (with our own server present)","Connector bars: batch 2 non-strict with our server, 13 servers, 122 tools, 62,676 tokens"),
 ("t-read","what",C,"of which 28 were","Hero drawing (script): your process, Claude Code, the API, with s1's counts; key is in its caption"),
]
p = "ledger.json"; U = json.load(open(p))
U = [u for u in U if u["id"] <= 262]
for u in U:
    lab = L[u["id"]]
    u["label"] = lab[0]
    if lab[0] == F: u["key"] = ""; u["note"] = lab[1]
    else: u["key"] = lab[1]
n = 262
U = [u for u in U if u["id"] <= n]
for t, sec, lab, key, text in EXTRA:
    n += 1; U.append({"id": n, "tab": t, "section": sec, "text": text, "label": lab, "key": key, "where": ""})
json.dump(U, open(p, "w"), indent=1, ensure_ascii=False); open(p, "a").write("\n")
print(len(U), "units")
