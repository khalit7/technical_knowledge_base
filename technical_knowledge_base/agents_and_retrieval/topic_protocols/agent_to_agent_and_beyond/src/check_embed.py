"""Confirm the page embeds exactly the current recordings, that every number quoted in the prose follows from
lab/out/*.json and inputs/, and that nothing private or secret-like is on the page or in src/.
Run after build.sh: python3 check_embed.py"""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "lab", "out")
sys.path.insert(0, os.path.join(H, "..", "..", "src")); import private_patterns as pp
page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
data = open(os.path.join(H, "parts", "22_js_data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, os.path.join(H, "gen_data.py")], check=True, capture_output=True)
assert open(os.path.join(H, "parts", "22_js_data.js"), encoding="utf-8").read() == data, "22_js_data.js is stale: rerun gen_data.py and build.sh"
assert data.split("window.A2AD=", 1)[1].strip() in page, "index.html does not embed the current data"
A = json.load(open(os.path.join(O, "a2a.json"))); M = json.load(open(os.path.join(O, "mcp_job.json")))
D = json.loads(data[len("window.A2AD="):].strip().rstrip(";"))
ok = []


def claim(text, cond):
    assert cond, "claim fails: " + text
    assert text in page, "claim text not on page: " + text
    ok.append(text)


sc = D["scen"]
claim("The card (1,059 bytes)", A["discovery"]["card_bytes"] == 1059)
claim("came back <b>304 Not Modified</b>", A["discovery"]["status"] == [200, 304])
claim('<td class="num">3,654 / 3,448</td>', (M["bytes_up"], M["bytes_down"]) == (3654, 3448))
claim('<td class="num">1,424</td>', M["context_chars"] == 1424 == sc["mcp"]["ctx"])
claim('<td class="num">6</td>', M["http_requests"] == 6)
claim("5 tool calls", sc["mcp"]["calls"] == 5)
claim('<td class="num">1,795 / 8,144</td>', (A["main"]["bytes_up"], A["main"]["bytes_down"]) == (1795, 8144))
claim('<td class="num">624</td>', sc["main"]["ctx"] == 624)
claim('<td class="num">4</td>', sc["main"]["requests"] == 4)
claim("less than half as much text", sc["main"]["ctx"] * 2 < sc["mcp"]["ctx"])
claim("seven POSTs for one task", len(A["push"]["webhook"]) == 7)
claim("<code>-32602 Context another-context does not match context ...</code>", A["err_context_mismatch"]["result"]["body"]["error"]["code"] == -32602)
claim("<code>-32009 A2A version '9.9' is not supported by this handler. Expected version '1.0'.</code>",
      A["err_unsupported_version"]["result"]["body"]["error"]["message"] == "A2A version '9.9' is not supported by this handler. Expected version '1.0'.")
claim("an empty header was read as <code>'0.3'</code>", "'0.3'" in A["err_no_version_header_means_0_3"]["result"]["body"]["error"]["message"])
claim("gave <code>-32601 Method not found</code>", A["err_v0_3_method_name"]["result"]["body"]["error"]["code"] == -32601)
claim("(<code>-32001 Task not found</code>)", A["err_other_callers_task"]["result"]["body"]["error"]["code"] == -32001)
claim("recorded as <code>-32004</code>", A["err_message_to_completed_task"]["result"]["body"]["error"]["code"] == -32004)
claim("<code>-32002</code>)", A["err_cancel_completed_task"]["result"]["body"]["error"]["code"] == -32002)
claim("<code>InvalidParamsError: Invalid push notification URL</code>", A["push_screened"]["client_error"] == "InvalidParamsError: Invalid push notification URL")
claim("<code>A2AClientError: HTTP Error 401</code>", A["no_token"]["client_error"].startswith("A2AClientError: HTTP Error 401"))
claim('<code>WWW-Authenticate: Bearer realm="eval-agent"</code>', any('www-authenticate: Bearer realm="eval-agent"' in w["data"] for w in A["no_token"]["wire"]))
claim("<code>\"shards\": 3.0</code>", '"shards": 3.0' in json.dumps(A["main"]["turn2"]))
claim("<b>The stream stayed open</b>", A["in_task_auth"]["stream_open_while_waiting"] and A["in_task_auth"]["final_state"] == "TASK_STATE_COMPLETED")
s = A["signing"]
claim("No valid signature found", s["verify_original"] == "valid" and s["verify_tampered"].startswith("InvalidSignaturesError: No valid signature found"))
r = A["resubscribe"]
claim("a <code>GetTask</code> in between said so", r["get_task_between"]["body"]["result"]["status"]["state"] == "TASK_STATE_WORKING")
snap = r["second_stream"][0]["data"]["result"]["task"]["artifacts"][0]["parts"]
claim("The snapshot held all four shards finished by then", len(snap) == 4)
U = json.load(open(os.path.join(H, "inputs", "ucp_allbirds_profile.json")))["ucp"]
claim("(version 2026-08-25)", U["version"] == "2026-08-25")
claim("offers shopping over MCP and embedded only", sorted(x["transport"] for x in U["services"]["dev.ucp.shopping"]) == ["embedded", "mcp"])
claim("a2a-sdk 1.2.2", A["versions"]["a2a-sdk"] == "1.2.2")
# privacy and secrets: page, data, src
bad = re.compile(r"glpat-|sk-ant-|BEGIN [A-Z ]*PRIVATE KEY|" + pp.alternation())
home = os.path.expanduser("~")
for root, _, files in os.walk(os.path.join(H, "..")):
    if ".shots" in root or "__pycache__" in root: continue
    for f in files:
        if f in ("check_embed.py", "redact.py"): continue  # these two hold the patterns themselves
        p = os.path.join(root, f); t = open(p, encoding="utf-8", errors="replace").read()
        assert not bad.search(t), "private or secret-like text in " + p
        assert home not in t, "home path in " + p
bearers = set(re.findall(r"Bearer ([\w.-]+)", page))
assert bearers <= {"lab-token-team-a", "lab-token-team-c", "hook-secret-lab", "token", "realm", "..."}, bearers
assert "\u2014" not in page
print(f"{len(ok)} claims hold; data embedded; no private or secret text (bearer values on page: {sorted(bearers)})")
