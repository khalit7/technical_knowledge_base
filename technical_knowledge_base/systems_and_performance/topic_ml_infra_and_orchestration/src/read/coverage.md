# Coverage against the old Notion page (TODO when Notion is back)

Notion is disconnected (2026-10-16), so the old root page 3c65c17b0d0d81b5925bfd1d8665dd4b and its old children could not be fetched. When the connection returns:
1. Fetch the old root and save it verbatim to src/live.md (copy the tool's file with a script).
2. List every distinct fact, tool, number and link in it and mark where the new page carries it (Reading section, lab tab, Tool map, child page) or why it is dropped (duplicate, or stale with its correction).
3. Check in particular any claims about: tool status (Determined, Kubeflow Training Operator, Neptune), Slurm/Kubernetes/Ray comparisons, failure rates, checkpoint formulas, cost figures; correct them against src/read/sources.md and the shared FACTS file.
4. Note whether the old page has child pages, databases or a video, with their exact tags, so publishing keeps them.
