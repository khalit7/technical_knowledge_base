// ---- Reading, section 7: one sentence pair through five scorers, step by step; each scorer's steps are explained by its step list sx-tx-<scorer>, and the live line gives this candidate's numbers ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f,esc=RD.esc;if(!$('rd-tx'))return;
  const T=EM.text,REF=T.ref;let cand=T.cands.find(c=>c.key==='reorder'),meth='bleu';
  const chips=(toks,cls,title)=>'<div class="toks"'+(title?' aria-label="'+esc(title)+'"':'')+'>'+toks.map((t,i)=>'<span class="'+(cls&&cls[i]||'')+'">'+esc(t)+'</span>').join('')+'</div>';
  const row=(lab,html)=>'<div class="ph">'+lab+'</div>'+html;
  // positions of clipped n-gram matches, as sacrebleu counts them (candidate side) and the reference n-grams they use
  function nmatch(h,r,n){const rc=new Map(),used=new Map(),ch=new Array(h.length).fill(''),rr=new Array(r.length).fill('');
    for(let i=0;i+n<=r.length;i++){const k=r.slice(i,i+n).join(' ');rc.set(k,(rc.get(k)||[]).concat([i]))}
    let clipped=0;for(let i=0;i+n<=h.length;i++){const k=h.slice(i,i+n).join(' '),L=rc.get(k)||[],u=used.get(k)||0;
      if(u<L.length){used.set(k,u+1);for(let q=0;q<n;q++){ch[i+q]='m1';rr[L[u]+q]='m1'}}else if(L.length)clipped++}
    return {ch,rr,clipped}}
  function stepsFor(){const c=cand.text,S=[];
    if(meth==='bleu'){const b=MX.bleu(c,REF),cnt=k=>RD.stat('p1 to p4',b.prec.map((v,i)=>i<k?F(v,1):'&middot;').join(' / '),'n-gram precisions, %')+RD.stat('Brevity penalty',k>=6?F(b.bp,3):'&middot;','c = '+b.h.length+', r = '+b.r.length)+RD.stat('BLEU',k>=7?F(b.score,1):'&middot;','sacrebleu: '+F(cand.lib.bleu,1));
      S.push({t:'Tokenise (13a)',d:'Candidate '+b.h.length+' tokens, reference '+b.r.length+'.',v:row('Reference',chips(b.r))+row('Candidate',chips(b.h)),c:cnt(0)});
      for(let n=1;n<=4;n++){const m=nmatch(b.h,b.r,n),tot=b.total[n-1],cor=b.correct[n-1];
        S.push({t:n+'-grams: '+cor+' of '+tot+' found',d:'p'+n+' = '+cor+' / '+tot+(cor?' = '+F(100*cor/tot,1)+'%':', zero, smoothed to '+F(b.prec[n-1],1)+'% by the exp method')+(m.clipped?'; '+m.clipped+' extra cop'+(m.clipped>1?'ies are':'y is')+' not credited (clipping)':'')+'.',v:row('Reference',chips(b.r,m.rr))+row('Candidate, tokens inside a matched '+n+'-gram',chips(b.h,m.ch)),c:cnt(n)})}
      S.push({t:'Geometric mean of the four precisions',d:'exp(mean of log p'+'n) = '+F(Math.exp(b.prec.slice(0,b.eff).reduce((a,v)=>a+Math.log(v),0)/b.eff),2)+'.',v:row('Reference',chips(b.r))+row('Candidate',chips(b.h)),c:cnt(4)});
      S.push({t:'Brevity penalty',d:(b.h.length<b.r.length?'BP = exp(1 &minus; '+b.r.length+'/'+b.h.length+') = '+F(b.bp,3):'The candidate is not shorter than the reference, so BP = 1')+'.',v:row('Reference',chips(b.r))+row('Candidate',chips(b.h)),c:cnt(6)});
      S.push({t:'BLEU = '+F(b.score,1),d:'sacrebleu.sentence_bleu gives '+F(cand.lib.bleu,2)+'.',v:row('Reference',chips(b.r))+row('Candidate',chips(b.h)),c:cnt(7)})}
    else if(meth==='rl'){const L=MX.rougeL(c,REF),h=L.ht,r=L.rt,ch=h.map(()=>''),rr=r.map(()=>'');L.pairs.forEach(([i,j])=>{ch[i]='m2';rr[j]='m2'});
      const cnt=k=>RD.stat('LCS length',k>=1?L.m:'&middot;','longest common subsequence')+RD.stat('P / R',k>=2?F(L.p,3)+' / '+F(L.r,3):'&middot;','LCS / candidate, LCS / reference')+RD.stat('ROUGE-L F1',k>=2?F(L.f,3):'&middot;','rouge-score: '+F(cand.lib.rl,3))+RD.stat('ROUGE-1 / 2 F1',F(cand.lib.r1,3)+' / '+F(cand.lib.r2,3),'for comparison');
      S.push({t:'Tokenise (rouge-score)',d:'Candidate '+h.length+' words, reference '+r.length+'.',v:row('Reference',chips(r))+row('Candidate',chips(h)),c:cnt(0)});
      S.push({t:'Longest common subsequence: '+L.m+' words',d:'"'+esc(L.pairs.map(([i])=>h[i]).join(' '))+'".',v:row('Reference',chips(r,rr))+row('Candidate',chips(h,ch)),c:cnt(1)});
      S.push({t:'ROUGE-L F1 = '+F(L.f,3),d:'Precision '+L.m+' / '+h.length+', recall '+L.m+' / '+r.length+', harmonic mean '+F(L.f,3)+'.',v:row('Reference',chips(r,rr))+row('Candidate',chips(h,ch)),c:cnt(2)})}
    else if(meth==='met'){const M=MX.meteor(c,REF),H=M.H,R=M.R,mk=st=>{const ch=H.map(()=>''),rr=R.map(()=>'');M.matches.forEach(([i,j,tag])=>{if(st==='all'||st===tag||(st==='exact+stem')){const cl=tag==='exact'?'m1':'m2';ch[i]=cl;rr[j]=cl}});return {ch,rr}};
      const ex=M.matches.filter(m=>m[2]==='exact').length,sm=M.matches.filter(m=>m[2]==='stem');
      const chunkCls=()=>{const ch=H.map(()=>'off'),rr=R.map(()=>'off');let k=0;M.matches.forEach((m,q)=>{if(q>0&&!(m[0]===M.matches[q-1][0]+1&&m[1]===M.matches[q-1][1]+1))k++;ch[m[0]]=k%2?'m3':'m1';rr[m[1]]=k%2?'m3':'m1'});return {ch,rr}};
      const cnt=k=>RD.stat('Matches',k>=1?(k>=2?M.m:ex)+' of '+H.length+' / '+R.length:'&middot;','exact '+ex+(k>=2?', stem '+sm.length:''))+RD.stat('Chunks',k>=3?M.chunks:'&middot;','runs in the same order')+RD.stat('F<sub>mean</sub>, penalty',k>=4?F(M.fmean,3)+', '+F(M.pen,3):'&middot;','10PR/(R+9P), 0.5(ch/m)<sup>3</sup>')+RD.stat('METEOR',k>=4?F(M.score,3):'&middot;','NLTK, no WordNet: '+F(cand.lib.met,3)+'; with: '+F(cand.lib.metwn,3));
      S.push({t:'Tokenise, lower case',d:'Candidate '+H.length+' tokens, reference '+R.length+'.',v:row('Reference',chips(R))+row('Candidate',chips(H)),c:cnt(0)});
      const e=mk('exact');S.push({t:'Stage 1, exact matches: '+ex,d:ex+' of the candidate\'s '+H.length+' words find an identical reference word.',v:row('Reference',chips(R,e.rr.map((v,j)=>M.matches.some(m=>m[1]===j&&m[2]==='exact')?'m1':'')))+row('Candidate',chips(H,e.ch.map((v,i)=>M.matches.some(m=>m[0]===i&&m[2]==='exact')?'m1':''))),c:cnt(1)});
      const a=mk('all');S.push({t:'Stage 2, Porter stems: '+sm.length+' more',d:sm.length?sm.map(m=>'"'+esc(H[m[0]])+'" and "'+esc(R[m[1]])+'" (stem '+esc(MX.stem(H[m[0]]))+')').join(', ')+'.':'No left-over word shares a stem with a left-over reference word.',v:row('Reference',chips(R,a.rr))+row('Candidate',chips(H,a.ch)),c:cnt(2)});
      const k3=chunkCls();S.push({t:'Fragmentation: '+M.chunks+' chunk'+(M.chunks>1?'s':''),d:M.m+' matches in '+M.chunks+' chunk'+(M.chunks>1?'s':'')+'.',v:row('Reference',chips(R,k3.rr))+row('Candidate',chips(H,k3.ch)),c:cnt(3)});
      S.push({t:'METEOR = '+F(M.score,3),d:'P = '+M.m+'/'+H.length+', R = '+M.m+'/'+R.length+', F<sub>mean</sub> = '+F(M.fmean,3)+'; penalty 0.5 &times; ('+M.chunks+'/'+M.m+')<sup>3</sup> = '+F(M.pen,3)+'.',v:row('Reference',chips(R,k3.rr))+row('Candidate',chips(H,k3.ch)),c:cnt(4)})}
    else if(meth==='chrf'){const C=MX.chrf(c,REF),hs=c.split(/\s+/).join(''),rs=REF.split(/\s+/).join('');
      const tab=k=>'<div class="bars">'+C.per.map(o=>'<div class="row"><span class="nm">'+o.n+'-grams: P '+F(o.p,2)+'</span><span class="track"><span class="fill" style="width:'+(k?100*o.p:0).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+o.m+'/'+o.nh+'</span></div><div class="row"><span class="nm">'+o.n+'-grams: R '+F(o.r,2)+'</span><span class="track"><span class="fill" style="width:'+(k?100*o.r:0).toFixed(1)+'%;background:var(--c3)"></span></span><span class="val">'+o.m+'/'+o.nr+'</span></div>').join('')+'</div>';
      const cnt=k=>RD.stat('Mean precision',k>=2?F(C.ap,3):'&middot;','over 6 orders')+RD.stat('Mean recall',k>=2?F(C.ar,3):'&middot;','over 6 orders')+RD.stat('chrF (&beta; = 2)',k>=2?F(C.score,1):'&middot;','sacrebleu: '+F(cand.lib.chrf,1));
      S.push({t:'Remove spaces, read characters',d:hs.length+' characters against '+rs.length+'.',v:row('Reference','<div class="toks"><span>'+esc(rs)+'</span></div>')+row('Candidate','<div class="toks"><span>'+esc(hs)+'</span></div>'),c:cnt(0)});
      S.push({t:'Character n-gram precision and recall, n = 1 to 6',d:'Blue bars precision, green bars recall, one pair per order.',v:tab(1),c:cnt(1)});
      S.push({t:'chrF = '+F(C.score,1),d:'Mean precision '+F(C.ap,3)+', mean recall '+F(C.ar,3)+'; sacrebleu gives '+F(cand.lib.chrf,1)+'.',v:tab(1),c:cnt(2)})}
    else{const B=cand.bs,rt=T.ref_tokens,ct=B.tokens,res=MX.bertscore(B.sim),b=T.baseline;
      const cnt=k=>RD.stat('Precision',k>=2?F(res.P,3):'&middot;','mean best match, candidate side')+RD.stat('Recall',k>=3?F(res.R,3):'&middot;','mean best match, reference side')+RD.stat('F1 raw / rescaled',k>=4?F(res.F,3)+' / '+F(MX.rescale(res.F,b.F),3):'&middot;','bert-score: '+F(B.F,3)+' / '+F(B.Fr,3));
      S.push({t:'Tokens, in context',d:'Candidate '+ct.length+' pieces, reference '+rt.length+', special tokens included.',v:row('Reference',chips(rt))+row('Candidate',chips(ct)),c:cnt(0)});
      const flat=B.sim.slice(1,-1).flatMap(r=>r.slice(1,-1)).sort((x,y)=>x-y),med=flat[Math.floor(flat.length/2)];
      S.push({t:'Cosine similarity of every pair',d:'Across all '+flat.length+' pairs of word pieces here the median similarity is '+F(med,2)+'.',v:heat(B.sim,ct,rt,null),c:cnt(1)});
      S.push({t:'Precision: each candidate piece takes its best match',d:'Precision '+F(res.P,3)+'.',v:heat(B.sim,ct,rt,res.bestR),c:cnt(2)});
      S.push({t:'Recall: each reference piece takes its best match',d:'Recall '+F(res.R,3)+'.',v:heat(B.sim,ct,rt,res.bestC),c:cnt(3)});
      S.push({t:'F1, then rescaled',d:'F1 = '+F(res.F,3)+'; with b = '+F(b.F,3)+', (F &minus; b)/(1 &minus; b) = '+F(MX.rescale(res.F,b.F),3)+'.',v:heat(B.sim,ct,rt,res.bestR),c:cnt(4)})}
    return S}
  function heat(sim,ct,rt,best){const box=$('rd-txV'),W=Math.min(RD.width(box),640),nr=sim.length,nc=sim[0].length,lab=Math.min(84,W*0.22),top=58,cs=Math.max(8,Math.min(22,(W-lab-4)/nc)),H=top+cs*nr+4;
    let mn=1,mx=0;sim.forEach(r=>r.forEach(v=>{mn=Math.min(mn,v);mx=Math.max(mx,v)}));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Token similarity matrix">';
    rt.forEach((t,j)=>{s+='<text transform="translate('+(lab+j*cs+cs*0.65)+','+(top-4)+') rotate(-60)" font-size="'+(cs<12?8:10)+'" fill="var(--mute)">'+esc(t.trim()||'_')+'</text>'});
    ct.forEach((t,i)=>{s+='<text x="'+(lab-4)+'" y="'+(top+i*cs+cs*0.72)+'" font-size="'+(cs<12?8:10)+'" text-anchor="end" fill="var(--mute)">'+esc(t.trim()||'_')+'</text>';
      for(let j=0;j<nc;j++){const a=(sim[i][j]-mn)/(mx-mn||1);s+='<rect x="'+(lab+j*cs)+'" y="'+(top+i*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="var(--c1)" fill-opacity="'+(0.05+0.9*a*a).toFixed(2)+'"/>'}});
    if(best)best.forEach(([i,j])=>{s+='<circle cx="'+(lab+j*cs+cs/2-0.5)+'" cy="'+(top+i*cs+cs/2-0.5)+'" r="'+(cs/2-1.5)+'" fill="none" stroke="var(--c2)" stroke-width="2"/>'});
    return '<div class="ph">Rows: candidate pieces. Columns: reference pieces. Range shown: '+F(mn,2)+' (light) to '+F(mx,2)+' (dark).</div><div class="vz">'+s+'</svg></div>'}
  let S=stepsFor(),A;const LS=['bleu','rl','met','chrf','bs'];
  function draw(k){S=S.length?S:stepsFor();const st=S[Math.min(k,S.length-1)];$('rd-txV').innerHTML='<div class="small mute" style="margin:4px 0">Reference: "'+esc(REF)+'" &nbsp; Candidate: "'+esc(cand.text)+'"</div>'+st.v;
    $('rd-txD').innerHTML='<b>On this candidate, step '+(k+1)+': '+st.t+'.</b> '+st.d;$('rd-txN').innerHTML=st.c}
  $('rd-txP').innerHTML=T.cands.filter(c=>c.key!=='copy').map(c=>'<button data-k="'+c.key+'"'+(c.key===cand.key?' class="on"':'')+'>'+esc(c.label)+'</button>').join('');
  function reset(){S=stepsFor();LS.forEach(m=>{$('sx-tx-'+m).hidden=m!==meth});A.reset(S.length,'sx-tx-'+meth)}
  $('rd-txP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cand=T.cands.find(c=>c.key===b.dataset.k);$('rd-txP').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));reset()});
  $('rd-txM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;meth=b.dataset.m;$('rd-txM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));reset()});
  A=RD.anim({card:'rd-tx',ctl:'rd-txC',n:S.length,draw,ms:4400,label:'Scoring step',list:'sx-tx-'+meth});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(meth==='bs'){S=stepsFor();A.redraw()}},150)});
})();
