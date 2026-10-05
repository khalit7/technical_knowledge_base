"""Fetch the machine-readable primary metadata the atlas cites (run 2026-10-05).

- RFC Editor JSON for every RFC the atlas names: https://www.rfc-editor.org/rfc/rfcNNNN.json
  (title, publication month, status, obsoletes / obsoleted_by / updated_by)
- IETF Datatracker JSON for the Internet-Drafts the atlas names: https://datatracker.ietf.org/doc/<draft>/doc.json
  (revision, last revision time, IESG state)

Writes sources/rfc_meta.json and sources/drafts.json. Standard library only.
Run: python3 fetch_sources.py   (or --rfc-only to refresh only the RFC metadata)
"""
import json, os, sys, urllib.request, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RFCS = [768, 791, 793, 5077, 6961, 7627, 8422, 1034, 1035, 1918, 2460, 2616, 4251, 4252, 4253, 4254, 5246, 5280, 6455, 6749, 6750,
        6962, 7230, 7301, 7515, 7517, 7518, 7519, 7540, 7541, 7591, 7636, 7858, 8200, 8252, 8259, 8305, 8312,
        8414, 8441, 8446, 8470, 8484, 8555, 8615, 8628, 8659, 8693, 8705, 8707, 8725, 8996, 9000, 9001, 9002,
        9068, 9110, 9111, 9112, 9113, 9114, 9162, 9204, 9218, 9220, 9250, 9293, 9325, 9369, 9421, 9438, 9449,
        9457, 9460, 9520, 9525, 9700, 9728, 9773, 9846, 9849, 9850, 9851, 9852, 9864, 9868, 9901, 9931, 9941,
        9954, 9987, 10008, 10015, 10017, 10024, 10036, 10042]
DRAFTS = ["draft-ietf-oauth-v2-1", "draft-ietf-oauth-rfc8725bis", "draft-ietf-tls-mlkem",
          "draft-ietf-webtrans-http3", "draft-ietf-oauth-identity-chaining"]
GH = ["modelcontextprotocol/modelcontextprotocol", "a2aproject/A2A", "Universal-Commerce-Protocol/ucp",
      "agentic-commerce-protocol/agentic-commerce-protocol", "google-agentic-commerce/AP2", "grpc/grpc",
      "protocolbuffers/protobuf", "OAI/OpenAPI-Specification", "graphql/graphql-spec",
      "standard-webhooks/standard-webhooks", "NVIDIA/nccl", "openssl/openssl", "curl/curl"]
GH_REPO_ONLY = ["i-am-bee/acp", "agntcy/acp-sdk", "spiffe/spiffe"]
KEEP = ("doc_id", "title", "pub_date", "status", "draft", "obsoletes", "obsoleted_by", "updates", "updated_by")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kb-atlas/1.0 (read-only metadata fetch)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    today = datetime.date.today().isoformat()
    if "--rfc-only" in sys.argv:  # refresh RFC metadata only (no GitHub API calls)
        rfc = {}
        for n in RFCS:
            d = get(f"https://www.rfc-editor.org/rfc/rfc{n}.json")
            rfc[str(n)] = {k: d.get(k) for k in KEEP}
            rfc[str(n)]["url"] = f"https://www.rfc-editor.org/rfc/rfc{n}.html"
            rfc[str(n)]["meta_url"] = f"https://www.rfc-editor.org/rfc/rfc{n}.json"
        json.dump({"fetched": today, "rfcs": rfc}, open(os.path.join(HERE, "sources/rfc_meta.json"), "w"), indent=1)
        print(len(rfc), "rfcs"); return
    rfc = {}
    for n in RFCS:
        d = get(f"https://www.rfc-editor.org/rfc/rfc{n}.json")
        rfc[str(n)] = {k: d.get(k) for k in KEEP}
        rfc[str(n)]["url"] = f"https://www.rfc-editor.org/rfc/rfc{n}.html"
        rfc[str(n)]["meta_url"] = f"https://www.rfc-editor.org/rfc/rfc{n}.json"
    drafts = {}
    for name in DRAFTS:
        d = get(f"https://datatracker.ietf.org/doc/{name}/doc.json")
        drafts[name] = {"rev": d.get("rev"), "time": d.get("time"), "state": d.get("state"),
                        "iesg_state": d.get("iesg_state"), "rfc": d.get("rfc"),
                        "url": f"https://datatracker.ietf.org/doc/{name}/"}
    gh = {}
    for r in GH:
        rel = get(f"https://api.github.com/repos/{r}/releases?per_page=8")
        gh[r] = [{"tag": x["tag_name"], "date": x["published_at"][:10], "pre": x["prerelease"], "url": x["html_url"]} for x in rel]
    for r in GH_REPO_ONLY:
        d = get(f"https://api.github.com/repos/{r}")
        gh[r] = {"archived": d.get("archived"), "created": d.get("created_at"), "pushed": d.get("pushed_at"),
                 "url": d.get("html_url"), "description": d.get("description")}
    d = get("https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/contents/schema")
    gh["mcp_schema_versions"] = [x["name"] for x in d]
    os.makedirs(os.path.join(HERE, "sources"), exist_ok=True)
    json.dump({"fetched": today, "github": gh}, open(os.path.join(HERE, "sources/github.json"), "w"), indent=1)
    json.dump({"fetched": today, "rfcs": rfc}, open(os.path.join(HERE, "sources/rfc_meta.json"), "w"), indent=1)
    json.dump({"fetched": today, "drafts": drafts}, open(os.path.join(HERE, "sources/drafts.json"), "w"), indent=1)
    print(len(rfc), "rfcs,", len(drafts), "drafts")


if __name__ == "__main__":
    main()
