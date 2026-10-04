// ---- Sample lab tab (ids lb-): every MathArena answer for three contests, scored by rule, with intervals and a paired test ----
(function(){
  const root=document.getElementById('t-lab');if(!root||!window.MA)return;
  const esc=RD.esc,F=MC.fmt;
  const st={c:0,a:null,b:null,ci:'ans',prob:14};
  const cache={};
  const statsOf=(ci,m)=>{const k=ci+'|'+m.n;if(!cache[k])cache[k]=MC.stats(m,MA.comps[ci].n);return cache[k]};
  const DEF=[['o1 (medium)','o3-mini (high)'],['GPT-5.2 (high)','Gemini 3 Pro (preview)'],['GPT-5.2 (high)','Claude-Opus-4.6 (High)']];
  const segC=document.getElementById('lb-comp');
  segC.innerHTML=MA.comps.map((c,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+c.name+'</button>').join('');
  const selA=document.getElementById('lb-a'),selB=document.getElementById('lb-b');
  function fillSel(){const c=MA.comps[st.c];
    const opts=c.models.map(m=>'<option value="'+esc(m.n)+'">'+esc(m.n)+(m.after?' (after contest)':'')+(m.r<4?' ('+m.r+' runs)':'')+'</option>').join('');
    selA.innerHTML=opts;selB.innerHTML='<option value="">none</option>'+opts;
    const has=n=>c.models.some(m=>m.n===n);
    st.a=has(DEF[st.c][0])?DEF[st.c][0]:c.models[0].n;st.b=has(DEF[st.c][1])?DEF[st.c][1]:'';
    selA.value=st.a;selB.value=st.b;st.prob=Math.min(st.prob,c.n-1)}
  const model=n=>MA.comps[st.c].models.find(m=>m.n===n);
  function scores(){const c=MA.comps[st.c],A=model(st.a),B=st.b?model(st.b):null;
    const cols=[A,B].filter(Boolean),S=cols.map(m=>statsOf(st.c,m));
    const row=(lab,f,note)=>'<tr><td>'+lab+(note?' <span class="mute small">'+note+'</span>':'')+'</td>'+S.map((s,j)=>'<td class="num">'+f(s,cols[j])+'</td>').join('')+'</tr>';
    let h='<div class="tw"><table><thead><tr><th>Rule</th>'+cols.map(m=>'<th class="num">'+esc(m.n)+(m.after?' <span class="fl">after contest</span>':'')+'</th>').join('')+'</tr></thead><tbody>';
    h+=row('One sample, pass@1',s=>F(s.p1,2)+'%','mean of all answers');
    [2,3,4].forEach(k=>{h+=row('Vote of '+k+', maj@'+k,(s,m)=>k<=m.r?F(s.maj[k-1],2)+'%':'n/a',k===2?'ties split, so equals pass@1':'')});
    [2,3,4].forEach(k=>{h+=row('Any of '+k+', pass@'+k,(s,m)=>k<=m.r?F(s.pk[k-1],2)+'%':'n/a',k===2?'unbiased estimator, needs the key':'')});
    h+=row('Problems right on every run',s=>s.all+' of '+c.n);
    h+=row('Problems never right',s=>s.none+' of '+c.n);
    h+=row('95% interval, per answer',s=>'±'+F(s.ciAns,2),'MathArena');
    h+=row('95% interval, clustered by problem',s=>'±'+F(s.ciClu,2));
    h+=row('95% interval, binomial on problems',s=>'±'+F(s.ciProb,2));
    h+=row('Answers, runs',(s,m)=>s.na+', '+m.r);
    h+=row('Mean output tokens per answer',(s,m)=>m.tok.toLocaleString('en-US'));
    h+=row('Cost of one run of the contest',(s,m)=>'$'+F(m.cost,2),'from the released records');
    h+=row('MathArena table (4 Oct 2026)',(s,m)=>m.acc==null?'n/a':F(m.acc,2)+'% ±'+(m.ci==null?'?':F(m.ci,2)));
    h+='</tbody></table></div>';
    document.getElementById('lb-scores').innerHTML=h;
    const P=document.getElementById('lb-pair');
    if(!B){P.innerHTML='<p class="note">Pick a model B to compare the two on the same problems.</p>';return}
    const sa=S[0],sb=S[1];
    const ra=sa.D.map(r=>{const v=r.filter(x=>x!==null);return v.length?v.filter(x=>x===0).length/v.length:null}),rb=sb.D.map(r=>{const v=r.filter(x=>x!==null);return v.length?v.filter(x=>x===0).length/v.length:null});
    const t=MC.permTest(ra,rb),diff=sa.p1-sb.p1;
    const pa=sa.p1/100,pb=sb.p1/100,se=Math.sqrt(pa*(1-pa)/c.n+pb*(1-pb)/c.n),z=se>0?Math.abs(pa-pb)/se:0;
    const pz=se>0?2*(1-ncdf(z)):1;
    P.innerHTML='<div class="out">'+RD.stat('Gap, A minus B',(diff>0?'+':'')+F(diff,2)+' pts','pass@1')+RD.stat('Problems where they differ',t.nd+' of '+c.n,'per-problem solve rates')+
      RD.stat('Paired permutation test',fmtP(t.p),(t.exact?'exact, ':'200,000 sign flips, ')+'two-sided')+RD.stat('Unpaired test, for contrast',fmtP(pz),'normal approximation, n = '+c.n+' each')+'</div>'+
      '<p class="note">The paired test flips the sign of each problem\'s difference at random (the procedure MathArena uses for its rank intervals); problems both models always solve or always miss carry no information and drop out. '+(t.p<0.05?'At 5% the gap is unlikely to be chance on these problems.':'At 5% the gap could be chance on these problems.')+'</p>';
  }
  function ncdf(x){const t=1/(1+0.2316419*x),d=0.3989423*Math.exp(-x*x/2);const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return 1-p}
  function fmtP(p){return p<0.0001?'p < 0.0001':'p = '+(p<0.01?p.toFixed(4):p.toFixed(3))}
  function grid(){const c=MA.comps[st.c],A=model(st.a),s=statsOf(st.c,A),G=document.getElementById('lb-grid');
    G.style.gridTemplateColumns='2.6em repeat('+c.n+',minmax(0,1fr))';const wide=(RD.width(G)-42)/c.n>=26;
    let h='<span></span>'+c.probs.map((p,j)=>'<span class="ph'+(j===st.prob?' sel':'')+'" data-p="'+j+'">'+p.i+'</span>').join('');
    for(let k=0;k<A.r;k++){h+='<span class="rl">run '+(k+1)+'</span>';
      s.D.forEach((row,j)=>{const x=row[k];const cls=x===null?'na':x===0?'ok':'no';const txt=x===null?'':c.probs[j].d[x].replace(/<[^>]+>/g,'');
        h+='<span class="cell '+cls+'" data-p="'+j+'" title="Problem '+c.probs[j].i+', run '+(k+1)+': '+esc(txt||'no answer')+'">'+(!wide||txt.length>4?'':esc(txt))+'</span>'})}
    G.innerHTML=h;
  }
  function probView(){const c=MA.comps[st.c],p=c.probs[st.prob],A=model(st.a),s=statsOf(st.c,A);
    const cnt={};let tot=0;c.models.forEach(m=>statsOf(st.c,m).D[st.prob].forEach(x=>{if(x!==null){cnt[x]=(cnt[x]||0)+1;tot++}}));
    const keys=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,6);
    let h='<div class="prob"><span class="plab">'+c.name+', problem '+p.i+'</span>'+p.q+' <span class="gold">'+p.d[0]+'</span></div>';
    h+='<p class="small">'+esc(A.n)+': '+s.D[st.prob].map(x=>x===null?'none':p.d[x]).join(', ')+'.</p>';
    h+='<div class="bars dist">'+keys.map(k=>'<div class="row'+(k==='0'?' hl':'')+'"><span class="nm">'+p.d[+k]+(k==='0'?' ✓':'')+'</span><span class="track"><span class="fill" style="width:'+(100*cnt[k]/tot)+'%;background:'+(k==='0'?'var(--good)':'var(--closed)')+'"></span></span><span class="val">'+cnt[k]+'</span></div>').join('')+'</div>';
    h+='<p class="note">Most common answers to this problem over all '+tot+' samples from the '+c.models.length+' configurations; '+(100*(cnt[0]||0)/tot).toFixed(1)+'% are right.</p>';
    document.getElementById('lb-prob').innerHTML=h;
  }
  function board(){const c=MA.comps[st.c],el=document.getElementById('lb-board');const W=RD.width(el),lw=Math.min(190,Math.max(120,W*0.36)),R=W-lw-46;
    const rows=c.models.map(m=>({m,s:statsOf(st.c,m)})).sort((a,b)=>b.s.p1-a.s.p1);const rh=17,H=rows.length*rh+26;
    const x=v=>lw+R*Math.max(0,Math.min(100,v))/100;
    let g='';[0,25,50,75,100].forEach(t=>{g+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="14" y2="'+(H-4)+'" stroke="var(--line)"/>'+RD.t(x(t),11,t+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=22+i*rh,hw=st.ci==='ans'?r.s.ciAns:st.ci==='clu'?r.s.ciClu:r.s.ciProb,sel=r.m.n===st.a;
      const mc=Math.max(8,Math.floor((lw-10)/5.9)),nm=r.m.n.length>mc?r.m.n.slice(0,mc-1)+'…':r.m.n;
      g+='<g class="lbrow" data-n="'+esc(r.m.n)+'" style="cursor:pointer"><rect x="0" y="'+(y-rh/2)+'" width="'+W+'" height="'+rh+'" fill="'+(sel?'var(--acc2)':'transparent')+'"/>'+
        RD.t(lw-6,y+4,esc(nm),{a:'end',fs:10.5,fill:r.m.after?'var(--bad)':'var(--ink)'})+
        '<line x1="'+x(r.s.p1-hw)+'" x2="'+x(r.s.p1+hw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--acc)" stroke-width="2"/><circle cx="'+x(r.s.p1)+'" cy="'+y+'" r="3.2" fill="var(--ink)"/>'+
        RD.t(W-2,y+4,r.s.p1.toFixed(1),{a:'end',fs:10,fill:'var(--mute)'})+'</g>'});
    el.innerHTML=RD.svg(W,H,g,'pass@1 with 95% intervals for every configuration');
    el.querySelectorAll('.lbrow').forEach(n=>n.addEventListener('click',()=>{st.a=n.dataset.n;selA.value=st.a;all()}));
  }
  function all(){scores();grid();probView();board()}
  RD.seg(segC,m=>{st.c=+m;fillSel();all()});
  RD.seg(document.getElementById('lb-ci'),m=>{st.ci=m;board()});
  selA.addEventListener('change',()=>{st.a=selA.value;all()});
  selB.addEventListener('change',()=>{st.b=selB.value;all()});
  document.getElementById('lb-grid').addEventListener('click',e=>{const t=e.target.closest('[data-p]');if(!t)return;st.prob=+t.dataset.p;grid();probView()});
  fillSel();
  let drawn=false;
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-lab']=[()=>{all();drawn=true}];
  let tm=0;addEventListener('resize',()=>{if(root.hidden||!drawn)return;clearTimeout(tm);tm=setTimeout(board,80)});
})();
