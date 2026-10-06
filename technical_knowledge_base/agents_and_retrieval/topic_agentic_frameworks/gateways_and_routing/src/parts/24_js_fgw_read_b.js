// ---- Reading tab, part 2: rate-limit traces (E4), budget animation (E5), cache table (E6), translation (E7), OpenRouter shares, router curve ----
(function(){
  const F=window.FGW,E=RD.esc;
  const usd=v=>'$'+(v>=0.001?v.toFixed(4):v.toFixed(5));

  // E4: recorded accept/reject ticks with LiteLLM's anchored windows
  let e4mode='burst';
  function windows(tr,phi){const out=[];let st=null;tr.forEach(([t])=>{const ti=Math.floor(t+phi);if(st===null||ti-st>=60){st=ti;out.push(st-phi)}});return out}
  function e4(){const el=document.getElementById('fgw-e4');if(!el)return;const tr=F.e4[e4mode],W=RD.width(el);
    const tmax=e4mode==='burst'?70:132,L=8,R=W-18,X=t=>L+(R-L)*t/tmax,H=96;let s='';
    windows(tr,F.phi[e4mode]).forEach((w,i)=>{s+='<rect x="'+X(Math.max(0,w))+'" y="14" width="'+(X(Math.min(tmax,w+60))-X(Math.max(0,w)))+'" height="40" fill="'+(i%2?'var(--soft)':'var(--acc2)')+'" opacity=".7"/>'+RD.t(X(Math.max(0,w))+3,24,'window '+(i+1),{fs:10,fill:'var(--mute)'})});
    for(let t=0;t<=tmax;t+=(W<600?(e4mode==='burst'?20:30):10))s+=RD.t(X(t),70,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    tr.forEach(([t,st])=>{s+='<rect x="'+(X(t)-1.2)+'" y="'+(st===200?30:42)+'" width="2.4" height="10" fill="'+(st===200?'var(--good)':'var(--bad)')+'"><title>'+t.toFixed(1)+' s: '+(st===200?'accepted':'429')+'</title></rect>'});
    s+=RD.t(L,88,'green: accepted; red: 429; shaded: LiteLLM\'s 60 s windows',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Accepted and refused requests on a key limited to 10 per minute');
    const acc=tr.filter(x=>x[1]===200).length;
    document.getElementById('fgw-e4note').textContent=e4mode==='burst'?'23 requests: '+acc+' accepted. Everything from second 50 to 65 is in two adjacent windows.':'130 requests, one per second: '+acc+' accepted. Window boundaries are whole wall-clock seconds; this run started 0.996 to 0.999 s into a second (fitted: the only offsets that reproduce all 130 decisions).'}
  RD.seg(document.getElementById('fgw-e4mode'),m=>{e4mode=m;e4()});e4();

  // E5: budget waves, three modes
  const B=F.e5.budget,pc=F.e5.per_call,wv=F.e5.waves;
  const MODES={old:'noreserve_no_max_tokens',nomax:'no_max_tokens',max16:'max_tokens_16'};
  let e5mode='nomax';
  function e5state(i){const w=wv[MODES[e5mode]];const a1=w.r.filter(x=>x[0]===1&&x[3]===200).length,a2=w.r.filter(x=>x[0]===2&&x[3]===200).length;
    const st=[{t:'20 calls arrive together',p:'Budget $'+B+'; each call really costs '+usd(pc)+', so 5 fit.',adm:0,spend:0,rsv:0,w:1},
      {t:'Admission, wave 1',p:e5mode==='old'?'Each call is checked against the spend recorded so far: $0 for all 20, so all 20 pass.':e5mode==='nomax'?'The first call reserves its worst case, about $0.082, far above the budget, so the reservation is shrunk to the whole $0.0004; the other 19 find nothing left and get HTTP 422.':'Each call reserves about $0.000095 (its input tokens plus 16 output tokens); four fit and a fifth takes the remainder; 15 get HTTP 422.',adm:a1,spend:0,rsv:e5mode==='old'?0:B,w:1},
      {t:'Wave 1 settles (2 s later)',p:'Each reservation is replaced by the real cost.',adm:a1,spend:a1*pc,rsv:0,w:1},
      {t:'Wave 2, 4 s after wave 1',p:a2?'Budget left: '+usd(B-a1*pc)+'. Again one call takes all of it.':'Nothing (or less than nothing) is left: all 20 are refused.',adm:a2,spend:a1*pc,rsv:a2?B-a1*pc:0,w:2},
      {t:'Final spend',p:'Recorded final spend '+usd(F.e5.spend_later['fgw-'+MODES[e5mode]])+' against a $'+B+' budget: '+(e5mode==='old'?'four times over.':'never over.'),adm:a2,spend:(a1+a2)*pc,rsv:0,w:2}];
    return st[i]}
  const e5cap=document.getElementById('fgw-e5cap');
  function e5(i){const el=document.getElementById('fgw-e5');if(!el)return;const s5=e5state(i),W=RD.width(el),w=wv[MODES[e5mode]];
    const L=8,R=W-18,maxv=Math.max(B*4.2,(s5.spend+s5.rsv)*1.05),X=v=>L+(R-L)*v/maxv;let s='';
    // request boxes
    const bw=Math.min(26,(R-L)/20-3);for(let k=0;k<20;k++){const x=L+k*(bw+3);const r=w.r.filter(q=>q[0]===s5.w)[k];
      const col=i===0?'var(--dim)':(r&&r[3]===200?'var(--good)':'var(--bad)');s+='<rect x="'+x+'" y="6" width="'+bw+'" height="16" rx="2" fill="'+col+'"/>'}
    s+=RD.t(L,36,'wave '+s5.w+': '+(i===0?'20 calls':(s5.adm+' accepted, '+(20-s5.adm)+' refused')),{fs:11});
    s+='<rect x="'+L+'" y="46" width="'+(R-L)+'" height="18" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<rect x="'+L+'" y="46" width="'+(X(s5.spend)-L)+'" height="18" fill="var(--c1)"/>';
    if(s5.rsv>0)s+='<rect x="'+X(s5.spend)+'" y="46" width="'+(X(s5.spend+s5.rsv)-X(s5.spend))+'" height="18" fill="var(--c5)" opacity=".75"/>';
    s+='<line x1="'+X(B)+'" x2="'+X(B)+'" y1="40" y2="70" stroke="var(--bad)" stroke-width="2"/>'+RD.t(X(B)+3,80,'budget $'+B,{fs:10.5,fill:'var(--bad)'});
    s+=RD.t(L,96,'spent '+usd(s5.spend)+(s5.rsv>0?'   reserved '+usd(s5.rsv):''),{fs:11});
    el.innerHTML=RD.svg(W,104,s,'Budget bar with spend and reservations');
    e5cap.innerHTML='<div class="t">'+E(s5.t)+'</div><p>'+E(s5.p)+'</p>'}
  const an5=RD.anim({card:'fgw-e5card',ctl:'fgw-e5ctl',n:5,draw:e5,ms:2000,label:'Budget step'});
  RD.seg(document.getElementById('fgw-e5mode'),m=>{e5mode=m;an5.reset(5);an5.play()});

  // E6: cache table
  (function(){const el=document.getElementById('fgw-e6');if(!el)return;
    el.innerHTML='<thead><tr><th>Call</th><th class="num">Seconds</th><th>Result</th><th>Cache key</th><th>Answer (first words)</th></tr></thead><tbody>'+F.e6.steps.map(s=>
      '<tr><td>'+E(s.label)+'</td><td class="num">'+s.s.toFixed(3)+'</td><td>'+(s.key?'<b style="color:var(--good)">hit</b>':'miss')+'</td><td class="mono">'+(s.key||'')+'</td><td class="small">'+E(s.text.split(' ').slice(0,9).join(' '))+' ...</td></tr>').join('')+'</tbody>'})();

  // E7: what reached the model server
  (function(){const el=document.getElementById('fgw-e7');if(!el)return;
    el.innerHTML='<div class="grid">'+F.e7.map(r=>'<div class="sp"><div class="n">model "'+E(r.model)+'"</div><p>Gateway sent <code>POST '+E(r.up_path)+'</code>, server answered '+r.up_status+'; caller got <b style="color:'+(r.status===200?'var(--good)':'var(--bad)')+'">'+r.status+'</b>.</p><p class="small mute">Body fields sent: '+r.up_keys.map(k=>'<code>'+E(k)+'</code>').join(', ')+'</p><pre class="small" style="white-space:pre-wrap;max-height:11em;overflow:auto">'+E(JSON.stringify(r.up_body,null,1)).slice(0,600)+'</pre></div>').join('')+'</div>'})();

  // OpenRouter shares
  const OR=F.or_eps,orKeys=Object.keys(OR);let orM='meta-llama/llama-3.3-70b-instruct';
  const pick=document.getElementById('fgw-orpick');
  pick.innerHTML=orKeys.map(k=>'<button data-m="'+E(k)+'"'+(k===orM?' class="on"':'')+'>'+E(k.split('/')[1])+'</button>').join('');
  pick.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pick.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));orM=b.dataset.m;orDraw()});
  function orDraw(){const el=document.getElementById('fgw-or');if(!el)return;const eps=OR[orM];const w=eps.map(e=>1/(e.in*e.in)),tot=w.reduce((a,b)=>a+b,0);
    const rows=eps.map((e,i)=>({e,sh:w[i]/tot})).sort((a,b)=>b.sh-a.sh);
    el.innerHTML='<div class="fgw-row small mute"><span class="nm">endpoint</span><span>share of first picks under the inverse-square rule</span><span class="v">$/M in</span></div>'+rows.map(({e,sh})=>
      '<div class="fgw-row"><span class="nm" title="'+E(e.tag||e.p)+'">'+E(e.p)+' <span class="mute small">'+E(e.q||'?')+', '+Math.round(e.ctx/1024)+'K</span></span><span class="fgw-bar"><span style="width:'+(sh*100).toFixed(1)+'%;background:var(--c4)"></span></span><span class="v">'+(sh*100).toFixed(1)+'%<br><span class="mute">'+e.in.toFixed(3)+'</span></span></div>').join('');
    const q=[...new Set(eps.map(e=>e.q||'unknown'))].join(', ');
    document.getElementById('fgw-ornote').textContent=eps.length+' endpoints on 6 October 2026; quantisation declared: '+q+'; context '+Math.min(...eps.map(e=>e.ctx)).toLocaleString('en-US')+' to '+Math.max(...eps.map(e=>e.ctx)).toLocaleString('en-US')+' tokens. Share = (1/price squared) over all endpoints, input price; illustration of the documented rule.'}
  orDraw();

  // Router curve
  function rt(){const el=document.getElementById('fgw-rt');if(!el)return;const T=F.router.tasks,n=T.length,W=RD.width(el);
    const weak=T.filter(t=>t.lok).length,strong=T.filter(t=>t.hok).length;
    const orc=T.filter(t=>!t.lok&&t.hok).length,cr=T.filter(t=>t.tier!=='SIMPLE');const crAcc=T.reduce((a,t)=>a+(t.tier!=='SIMPLE'?t.hok:t.lok),0);
    const L=40,R=W-12,Tp=10,Bt=170,X=f=>L+(R-L)*f,ymin=Math.floor((weak-4)/2)*2,ymax=n,Y=v=>Bt-(Bt-Tp)*(v-ymin)/(ymax-ymin);let s='';
    for(let v=ymin;v<=ymax;v+=2)s+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+3,v,{a:'end',fs:10,fill:'var(--mute)'});
    [0,0.25,0.5,0.75,1].forEach(f=>{s+=RD.t(X(f),Bt+14,Math.round(f*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    s+='<line x1="'+X(0)+'" y1="'+Y(weak)+'" x2="'+X(1)+'" y2="'+Y(strong)+'" stroke="var(--mute)" stroke-dasharray="4 4"/>';
    s+='<polyline fill="none" stroke="var(--good)" stroke-width="1.5" points="'+X(0)+','+Y(weak)+' '+X(orc/n)+','+Y(weak+orc)+' '+X(1)+','+Y(strong)+'"/>';
    const pt=(f,v,c,lab,dy)=>'<circle cx="'+X(f)+'" cy="'+Y(v)+'" r="5" fill="'+c+'"/>'+RD.t(X(f)+(f>0.8?-8:8),Y(v)+(dy||4),lab,{fs:11,a:f>0.8?'end':'start'});
    s+=pt(0,weak,'var(--c2)','all local: '+weak,14)+pt(1,strong,'var(--c1)','all Haiku: '+strong,18)+pt(orc/n,weak+orc,'var(--good)','perfect router: '+(weak+orc),-8)+pt(cr.length/n,crAcc,'var(--c4)','complexity router: '+crAcc,-8);
    el.innerHTML=RD.svg(W,Bt+20,s,'Questions answered correctly against share sent to the strong model')}
  rt();
  RD.onRender(()=>{e4();orDraw();rt();an5.redraw()});RD.onResize(()=>{e4();orDraw();rt();an5.redraw()});
})();
