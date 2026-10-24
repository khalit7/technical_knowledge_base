"""Which HTTP version do the official Python SDKs use over TLS? The lab server offers h2 and http/1.1 by ALPN;
the server log records the version each request arrived on. Default clients first, then with http2=True.
Writes raw/sdk_version.json. Usage: python sdk_version.py <ca.pem> <tls port> <server log> <out.json>
"""
import json, sys, time
import anthropic, openai

CA, PORT, SLOG, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
URL = f"https://127.0.0.1:{PORT}"
res = []
for label, h2 in [("default client", False), ("http2=True", True)]:
    for sdk in ("anthropic", "openai"):
        run = f"ver-{sdk}-{int(h2)}"
        if sdk == "anthropic":
            c = anthropic.Anthropic(api_key="sk-wirelab-not-a-real-key", base_url=URL, default_headers={"x-lab-run": run},
                                    http_client=anthropic.DefaultHttpxClient(verify=CA, http2=h2) if h2 else anthropic.DefaultHttpxClient(verify=CA))
            c.messages.create(model="wire-lab-1", max_tokens=16, messages=[{"role": "user", "content": "What colour is the sky?"}])
        else:
            c = openai.OpenAI(api_key="sk-wirelab-not-a-real-key", base_url=URL + "/v1", default_headers={"x-lab-run": run},
                              http_client=openai.DefaultHttpxClient(verify=CA, http2=h2) if h2 else openai.DefaultHttpxClient(verify=CA))
            c.chat.completions.create(model="wire-lab-1", messages=[{"role": "user", "content": "What colour is the sky?"}])
        seen = [json.loads(l) for l in open(SLOG) if json.loads(l)["run"] == run]
        res.append({"sdk": sdk, "client": label, "http_version": seen[-1].get("http_version")})
        print(res[-1])
json.dump({"recorded": time.strftime("%Y-%m-%d"), "versions": {"anthropic": anthropic.__version__, "openai": openai.__version__},
           "server": "lab_server.py over TLS, ALPN offers h2 and http/1.1", "runs": res}, open(OUT, "w"), indent=1)
