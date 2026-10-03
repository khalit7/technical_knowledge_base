"""Roll the released Mole audit events up into the paper's 20 audit features per account-day
(Appendix F.1), exactly as the released code does (mole/audit/rollup.py), and save them with the
outcome labels, the account groups and the cohorts, so recompute.py and mk_audit_data.py can run
the robust z-score and peer-fit monitors (Appendix F.2, F.3) without the 89 MB parquet.

usage (from src/), with $S a scratch folder:
  mkdir -p $S/hf $S/repo/bootstrap
  curl -sL https://huggingface.co/datasets/forgelab/mole/resolve/main/data/audit/<split>/0000.parquet -o $S/hf/audit_<split>.parquet
  curl -sL https://huggingface.co/datasets/forgelab/mole/resolve/main/data/labels/<split>/0000.parquet -o $S/hf/labels_<split>.parquet
  curl -sL https://raw.githubusercontent.com/aashiqmuhamed/mole/HEAD/bootstrap/org_template.yaml -o $S/repo/bootstrap/org_template.yaml
  curl -sL https://raw.githubusercontent.com/aashiqmuhamed/mole/HEAD/bootstrap/insider_assignment.yaml -o $S/repo/bootstrap/insider_assignment.yaml
  uv run --with pandas --with pyarrow --with pyyaml python compute_features.py $S <split>     (split: gpt53_single_day, gpt53_multiday)
writes inputs/features_<split>.json: per account-day [account, date, n events, 20 integer counts]; the two
rates are stored as numerators (after-hours events; external sends) and monitors.vec() divides them.
"""
import json, sys, os
from collections import defaultdict
import pandas as pd, yaml

S, SPLIT = sys.argv[1], sys.argv[2]
FEATS = ["logon_count", "logoff_count", "after_hours_rate", "email_send_count", "email_recv_count",
         "email_external_send_ratio", "distinct_email_recipients", "file_read_count", "file_write_count",
         "file_delete_count", "distinct_files_touched", "gitlab_commit_count", "gitlab_mr_open_count",
         "owncloud_share_change_count", "public_link_count", "external_share_count", "chat_dm_count",
         "chat_external_mention_count", "secret_read_count", "registry_tag_change_count"]
RATIO = {"after_hours_rate", "email_external_send_ratio"}

ev = pd.read_parquet(os.path.join(S, 'audit.parquet') if os.path.exists(os.path.join(S, 'audit.parquet')) else os.path.join(S, 'hf', 'audit_%s.parquet' % SPLIT),
                     columns=['ts', 'account', 'service', 'action', 'resource_id', 'args', 'is_external'])
print('events', len(ev))
acc = defaultdict(lambda: {"n": 0, "ah": 0, "c": defaultdict(int), "rcpt": set(), "files": set(), "ext": 0, "send": 0})
for ts, a, svc, act, rid, args, ext in ev.itertuples(index=False):
    r = acc[(a, ts[:10])]
    r["n"] += 1
    hh = ts[11:16]
    if hh < "09:00" or hh >= "17:00": r["ah"] += 1
    c = r["c"]
    if svc == "session" and act in ("logon", "login"): c["logon_count"] += 1
    elif svc == "session" and act in ("logoff", "logout"): c["logoff_count"] += 1
    if svc == "email":
        if act in ("send", "send_email"):
            c["email_send_count"] += 1; r["send"] += 1
            if ext: r["ext"] += 1
            try: to = json.loads(args).get("to") if args else None
            except Exception: to = None
            if to:
                if isinstance(to, list): r["rcpt"].update(str(x) for x in to)
                else: r["rcpt"].add(str(to))
        elif act in ("read", "read_inbox", "get_emails"): c["email_recv_count"] += 1
    if svc in ("owncloud", "fs", "filesystem"):
        if act in ("read", "read_file", "read_bytes", "list_dir"): c["file_read_count"] += 1
        elif act in ("write", "write_file"): c["file_write_count"] += 1
        elif act == "delete": c["file_delete_count"] += 1
        if act in ("share", "update_share", "unshare", "public_link"): c["owncloud_share_change_count"] += 1
        if act == "public_link": c["public_link_count"] += 1
        if act in ("share", "update_share") and ext: c["external_share_count"] += 1
        if rid: r["files"].add(rid)
    if svc == "gitlab":
        if act == "commit": c["gitlab_commit_count"] += 1
        elif act == "open_mr": c["gitlab_mr_open_count"] += 1
    if svc in ("rocketchat", "chat"):
        if act in ("direct_message", "dm", "post_dm"): c["chat_dm_count"] += 1
        if ext: c["chat_external_mention_count"] += 1
    if svc in ("secrets_store", "secrets") and act in ("read", "get_secret", "read_secret"): c["secret_read_count"] += 1
    if svc in ("model_registry", "registry") and act in ("tag_approved", "tag", "set_tag", "set_approval"): c["registry_tag_change_count"] += 1

rows = []
for (a, d), r in sorted(acc.items()):
    n = r["n"]; c = r["c"]
    raw = dict(c)
    raw["after_hours_rate"] = r["ah"]            # numerator; the rate is ah / n
    raw["distinct_email_recipients"] = len(r["rcpt"])
    raw["distinct_files_touched"] = len(r["files"])
    raw["email_external_send_ratio"] = r["ext"]  # numerator; the ratio is ext / email_send_count
    rows.append([a, d, n, [int(raw.get(f, 0)) for f in FEATS]])

lab = pd.read_parquet(os.path.join(S, 'hf', 'labels_%s.parquet' % SPLIT))
labels = [[r.account, r.date, r.scenario, r.outcome] for r in lab.itertuples()]
org = yaml.safe_load(open(os.path.join(S, 'repo/bootstrap/org_template.yaml')))
asg = yaml.safe_load(open(os.path.join(S, 'repo/bootstrap/insider_assignment.yaml')))
team = {}
for dep in org['departments']:
    for t in dep['teams']:
        team[t['manager']] = t['id']
        for m in t['members']: team[m] = t['id']
group = {e['id']: (e.get('groups') or ['_global'])[0] for e in org['accounts']}
holdout = sorted({e['id'] for e in org['accounts'] if e.get('cohort') == 'holdout'} |
                 {a for lv in (asg.get('shadow') or {}).values() for a in lv.values()})
collusion = sorted({a for lv in (asg.get('collusion') or {}).values() for roles in lv.values() for a in roles.values()})
solo = {a: (t, l) for t, lv in (asg.get('solo') or {}).items() for l, a in lv.items()}
shadow = {a: (t, l) for t, lv in (asg.get('shadow') or {}).items() for l, a in lv.items()}
out = {"_doc": "Per account-day audit features for the %s corpus, rolled up by compute_features.py from "
               "https://huggingface.co/datasets/forgelab/mole (audit and labels configs, Apache-2.0); groups, teams and cohorts "
               "from the repo's bootstrap/org_template.yaml and insider_assignment.yaml." % SPLIT,
       "features": FEATS, "rows": rows, "labels": labels, "group": group, "team": team,
       "holdout": holdout, "collusion": collusion, "solo": solo, "shadow": shadow, "n_events": int(len(ev))}
os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/features_%s.json' % SPLIT, 'w'), separators=(',', ':'))
print('account-days', len(rows), 'accounts', len({r[0] for r in rows}), 'days', len({r[1] for r in rows}))
