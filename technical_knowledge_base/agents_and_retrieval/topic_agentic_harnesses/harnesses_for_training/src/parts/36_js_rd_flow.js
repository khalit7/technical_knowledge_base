// ---- Reading: two static annotated flow diagrams (the hero at the top, the fleet in section 8) ----
// Boxes laid out in a snake at the measured width: one row when wide, three or two columns when narrow.
// Each box: title, short lines (wrapped to the box), hl = the page's highlight (the harness). Links: '>' one way, '<>' both ways.
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  function wrap(s,max){const out=[];let cur='';s.split(' ').forEach(w=>{if(cur&&(cur+' '+w).length>max){out.push(cur);cur=w}else cur=cur?cur+' '+w:w});if(cur)out.push(cur);return out}
  function flow(el,boxes,links,label){
    const w=Math.min(860,RD.width(el)),n=boxes.length;
    const cols=w>=760?n:w>=470?3:2,rows=Math.ceil(n/cols),gx=cols===n?22:26,gy=30;
    const bw=(w-2-(cols-1)*gx)/cols,maxc=Math.max(12,Math.floor((bw-14)/6.3));
    const L=boxes.map(b=>[].concat(...b.sub.map(x=>wrap(x,maxc))));
    const bh=26+15*Math.max(...L.map(x=>x.length))+6;
    const pos=boxes.map((b,i)=>{const r=Math.floor(i/cols),k=i%cols,c=r%2?cols-1-k:k;return {x:1+c*(bw+gx),y:4+r*(bh+gy),r,c}});
    let g='<defs><marker id="'+el.id+'-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    links.forEach(([a,b,t])=>{const A=pos[a],B=pos[b];let x1,y1,x2,y2;
      if(A.r===B.r){const dir=B.c>A.c?1:-1;x1=dir>0?A.x+bw:A.x;x2=dir>0?B.x:B.x+bw;y1=y2=A.y+bh/2}
      else{x1=x2=A.x+bw/2;y1=A.y+bh;y2=B.y}
      const m=' marker-end="url(#'+el.id+'-ah)"'+(t==='<>'?' marker-start="url(#'+el.id+'-ah)"':'');
      g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.6"'+m+'/>'});
    boxes.forEach((b,i)=>{const p=pos[i];
      g+='<rect x="'+p.x+'" y="'+p.y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="'+(b.hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(b.hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(b.hl?2:1)+'"/>';
      g+=RD.t(p.x+8,p.y+18,esc(b.t),{fs:12.5,w:700,fill:b.hl?'var(--acc)':'var(--ink)'});
      L[i].forEach((ln,j)=>{g+=RD.t(p.x+8,p.y+36+15*j,esc(ln),{fs:11,fill:'var(--ink)'})})});
    el.innerHTML=RD.svg(w,4+rows*(bh+gy)-gy+4,g,label);
  }
  const HERO=[
    {t:'1 Task',sub:['A repo with a planted bug and an issue; reset gives a fresh copy']},
    {t:'2 Policy',sub:['The model; samples token ids with their log-probs']},
    {t:'3 Harness',hl:1,sub:['Its tools are the action space; it formats results and decides when to stop']},
    {t:'4 Sandbox',sub:['A container with no network runs each tool call']},
    {t:'5 Verifier',sub:['Hidden checks in a fresh container, outside the workspace']},
    {t:'6 Reward',sub:['1 or 0, or the share of 20 checks passed']}];
  const HL=[[0,1,'>'],[1,2,'<>'],[2,3,'<>'],[3,4,'>'],[4,5,'>']];
  const PROD=[
    {t:'1 Task store',sub:['Real issues (SWE-Gym: 2,438) or injected bugs; DeepSWE: 4,500 R2E-Gym problems']},
    {t:'2 Inference engine',sub:['Serves the policy and records token ids and log-probs: token-in, token-out']},
    {t:'3 Harness',hl:1,sub:['An unmodified product (Claude Code, Codex) behind a recording proxy']},
    {t:'4 Sandbox fleet',sub:['DSec: about 3M a day on about 160 nodes, over 5,000 created per second']},
    {t:'5 Verifier service',sub:['Hidden tests in a fresh container per rollout']},
    {t:'6 Trainer',sub:['DeepSWE: 64 problems x 8 = 512 rollouts a step, 64 H100s for 6 days; new weights go to 2']}];
  function draw(){
    if($('ht-herosvg'))flow($('ht-herosvg'),HERO,HL,'One episode: task, policy, harness, sandbox, verifier, reward');
    if($('ht-prodsvg'))flow($('ht-prodsvg'),PROD,HL,'The same loop as services at scale');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
