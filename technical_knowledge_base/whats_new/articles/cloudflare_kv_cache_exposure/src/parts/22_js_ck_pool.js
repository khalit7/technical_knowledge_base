// The pool check (top of Reading): which path a prompt takes, from the post's numbers and SGLang's v0.5.19 length rule.
// Same rule as src/recompute.py; check_page.mjs compares CK_POOL.path with inputs/recompute.json (window.ARTICLE.recompute).
(function(){
  const CTX=1048576,POOL={launch:681280,fixed:2040000},PAGE=64;
  const limit=(ctx,pool)=>Math.min(ctx-1,pool-1)-5;
  function path(L,pool,fixedEngine){
    const lim=limit(CTX,pool),reserved=Math.ceil(L/PAGE);
    if(L<lim)return {route:'normal',http:200,reserved:reserved,written_tokens:L,written_pages:reserved,stale_tokens:0,own_share:1};
    if(fixedEngine)return {route:'rejected, retired before handoff',http:400,reserved:0,written_tokens:0,written_pages:0,stale_tokens:0,own_share:null};
    return {route:'rejected, handed off anyway',http:200,reserved:reserved,written_tokens:1,written_pages:1,stale_tokens:L-1,own_share:1/L};
  }
  window.CK_POOL={path:path,limit:limit,CTX:CTX,POOL:POOL,PAGE:PAGE};
  const el=document.getElementById('ck-pool-svg');if(!el)return;
  const out=document.getElementById('ck-pool-out'),sl=document.getElementById('ck-L'),lv=document.getElementById('ck-L-v');
  const S={cfg:'launch',eng:'old'};
  const f=n=>n.toLocaleString('en-US');
  function draw(){
    const L=+sl.value,pool=POOL[S.cfg],lim=limit(CTX,pool),W=RD.width(el),narrow=W<520;
    const x0=12,x1=W-12,MAX=2100000,X=v=>x0+(x1-x0)*v/MAX;
    let s='';
    const rows=[['context window',CTX,'none','var(--ink)',30],['prefill KV pool',pool,'var(--soft)','var(--mute)',78]];
    rows.forEach(([name,v,fill,st,y])=>{
      s+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(v)-X(0))+'" height="22" rx="4" fill="'+(fill==='none'?'var(--card)':fill)+'" stroke="'+st+'" stroke-width="1.5"/>';
      s+=RD.t(X(0)+6,y-6,name+': '+f(v)+' tokens',{fs:12,fill:'var(--ink)'});
    });
    if(lim<CTX-6){s+='<rect x="'+X(lim)+'" y="30" width="'+(X(CTX)-X(lim))+'" height="22" fill="var(--bad)" fill-opacity=".22"/>';
      s+=RD.t((X(lim)+X(CTX))/2,46,narrow?'refused':'refused inside',{a:'middle',fs:12,fill:'var(--bad)',w:600})}
    const xp=X(L),rej=L>=lim;
    s+='<line x1="'+xp+'" x2="'+xp+'" y1="20" y2="112" stroke="'+(rej?'var(--bad)':'var(--good)')+'" stroke-width="2.5"/>';
    const lab=(narrow?'':'prompt ')+f(L);s+=RD.t(Math.min(Math.max(xp,x0+40),x1-40),128,lab,{a:'middle',fs:12,fill:rej?'var(--bad)':'var(--good)',w:600});
    [0,500000,1000000,1500000,2000000].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="138" y2="143" stroke="var(--line)"/>'+RD.t(X(v),156,v?(v/1e6)+'M':'0',{a:v?'middle':'start',fs:11,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,162,s,'Prompt of '+f(L)+' tokens against a '+f(CTX)+'-token window and a '+f(pool)+'-token prefill pool');
    lv.textContent=f(L);
    const r=path(L,pool,S.eng==='new');
    const share=r.own_share===null?'nothing read':(r.own_share===1?'100%':(100*r.own_share).toPrecision(2)+'% (1 token)');
    out.innerHTML=RD.stat('Path',r.route==='normal'?'<span class="ck-ok">normal</span>':'<span class="'+(r.http===400?'ck-ok':'ck-bad')+'">'+(r.http===400?'refused, retired':'refused, handed off')+'</span>','limit '+f(lim)+' tokens')+
      RD.stat('Client receives','HTTP '+r.http,r.route==='normal'?'a real answer':(r.http===400?'the length error':'should have been 400'))+
      RD.stat('Decode pages reserved',f(r.reserved),'64 tokens each')+
      RD.stat('Written by this request',f(r.written_tokens)+(r.written_tokens===1?' token':' tokens'),r.stale_tokens?f(r.stale_tokens)+' tokens of leftovers read':'no leftovers read')+
      RD.stat('Share of attended KV that is its own',share,'');
  }
  sl.addEventListener('input',draw);
  RD.seg(document.getElementById('ck-cfg'),m=>{S.cfg=m;draw()});
  RD.seg(document.getElementById('ck-eng'),m=>{S.eng=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
