// ---- Vector search lab: Matryoshka x quantization explorer ----
(function(){
  const V=window.VEC,$=V.$,esc=V.esc,f3=V.f3,Q=V.D.mq.qwen3;
  const DIMS=[32,64,128,256,512,768,1024];
  const PC={float32:'var(--c1)',int8:'var(--c3)','int8-sym':'var(--c5)',binary:'var(--c2)'};
  const PN={float32:'float32','int8':'int8 (float query)','int8-sym':'int8, query quantized too',binary:'binary'};
  let d=1024,p='float32',r=0;
  const find=(d,p,r)=>Q.rows.find(x=>x.d===d&&x.prec===p&&(x.rescore||0)===r);
  const fmtB=b=>b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' kB':Math.round(b)+' B';
  function draw(){
    const rs=$('vec-q-r');rs.querySelectorAll('button').forEach(b=>{b.disabled=p==='float32'&&b.dataset.v!=='0';b.style.opacity=b.disabled?.4:1});
    if(p==='float32')r=0;
    rs.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',+b.dataset.v===r);b.setAttribute('aria-pressed',+b.dataset.v===r?'true':'false')});
    const x=find(d,p,r);
    $('vec-q-dv').textContent=d.toLocaleString('en-US');
    $('vec-q-stats').innerHTML=
      '<div class="stat"><div class="k">Bytes per vector</div><div class="v">'+(x.bytes_per_vector%1?x.bytes_per_vector.toFixed(0):x.bytes_per_vector.toLocaleString('en-US'))+' B</div><div class="d">'+(4096/x.bytes_per_vector).toFixed(0)+'&times; smaller than 4,096</div></div>'+
      '<div class="stat"><div class="k">10 million vectors</div><div class="v">'+fmtB(1e7*x.bytes_per_vector)+'</div><div class="d">'+(r?'+ the float32 originals on disk for rescoring':'codes only, before any index')+'</div></div>'+
      '<div class="stat"><div class="k">nDCG@10</div><div class="v">'+f3(x.ndcg10)+'</div><div class="d">full float32: '+f3(Q.full.ndcg10)+'</div></div>'+
      '<div class="stat"><div class="k">Recall@10 (labels)</div><div class="v">'+f3(x.recall10)+'</div><div class="d">full: '+f3(Q.full.recall10)+'</div></div>'+
      '<div class="stat"><div class="k">Same as full search (top 10)</div><div class="v">'+V.pc(x.agree10)+'</div><div class="d">'+(x.ties_at_10!=null?x.ties_at_10+' claims tied at rank 10':'index-side recall')+'</div></div>';
    plot(x);
  }
  function plot(sel){
    const el=$('vec-q-plot'),W=V.width(el),H=260,L=46,R=12,T=10,B=40;
    const lx=v=>Math.log2(v),x0=lx(4),x1=lx(4096),X=v=>L+(lx(v)-x0)/(x1-x0)*(W-L-R),y0=0,y1=0.75,Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-B);
    let s='';
    for(let v=0;v<=0.75;v+=0.15){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+V.T(L-5,Y(v)+4,v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
    [4,16,64,256,1024,4096].forEach(b=>{s+=V.T(X(b),H-B+14,b.toLocaleString('en-US'),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=V.T(L+(W-L-R)/2,H-6,'bytes per vector (log scale); filled = no rescoring, hollow = rescored',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+=V.T(L+4,T+10,'nDCG@10',{fs:10,fill:'var(--mute)'});
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(Q.full.ndcg10).toFixed(1)+'" y2="'+Y(Q.full.ndcg10).toFixed(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    ['float32','int8','int8-sym','binary'].forEach(pp=>{let path='';DIMS.forEach(dd=>{const x=find(dd,pp,0);path+=(path?'L':'M')+X(x.bytes_per_vector).toFixed(1)+' '+Y(x.ndcg10).toFixed(1)});
      s+='<path d="'+path+'" fill="none" stroke="'+PC[pp]+'" stroke-width="1.3" opacity=".6"/>'});
    Q.rows.forEach(x=>{const on=x===sel,hol=!!x.rescore;const jit=hol?({20:-3,40:-1,100:1,400:3})[x.rescore]:0;
      s+='<circle cx="'+(X(x.bytes_per_vector)+jit).toFixed(1)+'" cy="'+Y(x.ndcg10).toFixed(1)+'" r="'+(on?6.5:hol?2.6:3.2)+'" fill="'+(hol?'var(--bg)':PC[x.prec])+'" stroke="'+(on?'var(--ink)':PC[x.prec])+'" stroke-width="'+(on?2.2:1.2)+'"><title>'+x.d+' dims, '+esc(PN[x.prec])+(x.rescore?', rescore '+x.rescore:'')+': nDCG '+f3(x.ndcg10)+', '+x.bytes_per_vector+' B</title></circle>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="nDCG against bytes per vector for every setting">'+s+'</svg><div class="vec-leg">'+Object.keys(PC).map(k=>'<span><i style="background:'+PC[k]+'"></i>'+esc(PN[k])+'</span>').join('')+'<span>dashed: full float32 1,024 dims</span></div>';
    $('vec-q-note').innerHTML='int8: per-dimension minimum and maximum over the corpus, 256 levels; "float query" compares the float query with the decoded codes (as FAISS\'s SQ8 does), "query quantized too" takes the integer dot product of two code vectors. Binary: sign bits; ties at rank 10 broken by document order. Rescoring reads the R candidates\' full float32 1,024-dim vectors. Cross-check: int8 with a float query at 1,024 dims agrees '+V.pc(find(1024,'int8',0).agree10)+' with full search, against 0.995 for FAISS SQ8 on the child page; binary without rescoring '+V.pc(find(1024,'binary',0).agree10)+' against 0.674 there. Truncated vectors are re-normalised.';
  }
  function mrl(){
    const el=$('vec-q-mrl'),W=V.width(el),H=230,L=46,R=12,T=10,B=40;
    const ser=[['qwen3','Qwen3-Embedding (trained for truncation)','var(--c1)'],['gte','gte-modernbert (not)','var(--c2)'],['bge','bge-small (not)','var(--c3)']];
    const X=v=>L+(Math.log2(v)-Math.log2(1/32))/(Math.log2(1)-Math.log2(1/32))*(W-L-R),Y=v=>T+(1-(v-0.3)/(1.02-0.3))*(H-T-B);
    let s='';
    [0.4,0.6,0.8,1].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+V.T(L-5,Y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    [1/32,1/16,1/8,1/4,1/2,1].forEach(f=>{s+=V.T(X(f),H-B+14,f===1?'all':'1/'+Math.round(1/f),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=V.T(L+(W-L-R)/2,H-6,'share of the dimensions kept (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    ser.forEach(([k,nm,c])=>{const M=V.D.mq[k],fr=M.rows.filter(x=>x.prec==='float32');let path='';
      fr.forEach(x=>{path+=(path?'L':'M')+X(x.d/M.full_dim).toFixed(1)+' '+Y(x.ndcg10/M.full.ndcg10).toFixed(1)});
      s+='<path d="'+path+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+fr.map(x=>'<circle cx="'+X(x.d/M.full_dim).toFixed(1)+'" cy="'+Y(x.ndcg10/M.full.ndcg10).toFixed(1)+'" r="3" fill="'+c+'"><title>'+esc(nm)+': '+x.d+' of '+M.full_dim+' dims, nDCG '+f3(x.ndcg10)+'</title></circle>').join('')});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Truncation curves">'+s+'</svg><div class="vec-leg">'+ser.map(x=>'<span><i style="background:'+x[2]+'"></i>'+esc(x[1])+'</span>').join('')+'</div>';
    const g=k=>V.D.mq[k],at=(k,d)=>g(k).rows.find(x=>x.prec==='float32'&&x.d===d);
    $('vec-q-mrl-note').innerHTML='Half the dimensions: Qwen3 keeps '+V.pc(at('qwen3',512).ndcg10/g('qwen3').full.ndcg10,0)+' of its nDCG ('+f3(at('qwen3',512).ndcg10)+'), gte-modernbert '+V.pc(at('gte',384).ndcg10/g('gte').full.ndcg10,0)+' ('+f3(at('gte',384).ndcg10)+'), bge-small '+V.pc(at('bge',192).ndcg10/g('bge').full.ndcg10,0)+'. A quarter: Qwen3 '+V.pc(at('qwen3',256).ndcg10/g('qwen3').full.ndcg10,0)+', bge-small '+V.pc(at('bge',96).ndcg10/g('bge').full.ndcg10,0)+'. Even truncated to 384 dims, gte ('+f3(at('gte',384).ndcg10)+') still beats Qwen3 at 1,024 ('+f3(g('qwen3').full.ndcg10)+') on SciFact.';
  }
  V.seg($('vec-q-p'),v=>{p=v;if(p!=='float32'&&!r)r=0;draw()});
  V.seg($('vec-q-r'),v=>{r=+v;draw()});
  $('vec-q-d').addEventListener('input',e=>{d=DIMS[+e.target.value];draw()});
  const b1=find(1024,'binary',100),b0=find(1024,'binary',0),b2=find(256,'binary',100);
  $('vec-q-pr-ans').innerHTML='All of it: '+f3(b1.ndcg10)+' (the full float32 search gives '+f3(Q.full.ndcg10)+'), and '+V.pc(b1.agree10)+' of the full top 10 comes back. Without rescoring the binary codes alone give '+f3(b0.ndcg10)+'. The trick stops working when the codes are too short: binary on the first 256 dimensions (32 bytes) with the same rescoring reaches '+f3(b2.ndcg10)+'.';
  V.predict($('vec-q-pr'));
  V.onRender(()=>{draw();mrl()});
})();
