// ---- Our reading of the two generated answers for SciFact claim 54 (src/gen_case.py; inputs/gen_case54.json). Gold label: CONTRADICT. ----
window.A54_READING={
  bm25_lucene:{
    e2e:[0,'SciFact\'s label is CONTRADICT; the answer says "Supported". Wrong.'],
    gen:[0,'Our reading: unfaithful. The answer quotes passage 1 on JAK1 and 14-3-3 proteins in endothelial cells and fibroblasts and claims it shows AMPK "leads to increased inflammation-related fibrosis"; none of the three passages mentions lung fibrosis. With nothing relevant in context the instructed answer was "Unable to answer". Both halves failed here, and the retrieval failure comes first: no generator could reach CONTRADICT without the evidence.','no']},
  hybrid_rrf:{
    e2e:[0,'The answer still says "Supported": still wrong end to end, so a single accuracy number would say the retrieval change did nothing.'],
    gen:[0,'Split, it did: hit@3 is now 1, and the answer even cites passage 2 ("metformin, an AMPK activator, reverses established lung fibrosis"), then calls that support for a claim that AMPK activation increases fibrosis. Retrieval now passes and generation fails: an Evident Conflict in RAGTruth\'s terms. The split moved the bug and names the next fix, the generator (a stronger model, or an instruction to check the direction of the effect).','no']}
};
