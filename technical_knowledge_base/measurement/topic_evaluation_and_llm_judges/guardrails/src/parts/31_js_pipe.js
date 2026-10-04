// ---- Pipeline lab tab: configure stages, trade-off curves, conformal threshold, injection set, refusal flag, every conversation ----
(function(){
  const X=GR.X,DP=GR.DP,esc=RD.esc,TAB='t-pipe';
  const st={sys:false,pi:'off',piT:0.5,inp:'loose',inpT:0.5,out:'off',outT:0.5,cv:'inp',flt:'all',alpha:0.05,seed:1,dpT:0.5};
  const cfgOf=()=>({sys:st.sys,pi:st.pi==='on'?st.piT:false,inp:st.inp==='off'?false:st.inp==='thr'?st.inpT:st.inp,out:st.out==='off'?false:st.out==='thr'?st.outT:st.out});
  const sel=(id,label,opts,val)=>'<label>'+label+'<br><select id="'+id+'">'+opts.map(([k,n])=>'<option value="'+k+'"'+(k===val?' selected':'')+'>'+n+'</option>').join('')+'</select></label>';
  const rng=(id,label,v)=>'<label>'+label+': <b id="'+id+'v"></b><input type="range" id="'+id+'" min="0.01" max="0.99" step="0.01" value="'+v+'"></label>';
  const ctl=document.getElementById('pl-ctl');
  ctl.innerHTML=sel('pl-sys','Answers',[['0','Mistral-7B-Instruct, plain'],['1','Same model, guardrail system prompt']],'0')+
    sel('pl-pi','Injection detector before the call (DeBERTa)',[['off','Off'],['on','On, threshold below']],'off')+rng('pl-piT','Injection threshold',0.5)+
    sel('pl-inp','Input rail (Qwen3Guard, prompt)',[['off','Off'],['loose','Loose: block Unsafe'],['strict','Strict: block Unsafe or Controversial'],['thr','Threshold below']],'loose')+rng('pl-inpT','Input threshold',0.5)+
    sel('pl-orl','Output rail (Qwen3Guard, prompt and answer)',[['off','Off'],['loose','Loose: block Unsafe'],['strict','Strict: block Unsafe or Controversial'],['thr','Threshold below']],'off')+rng('pl-outT','Output threshold',0.5);
  ctl.addEventListener('input',e=>{const t=e.target;
    if(t.id==='pl-sys')st.sys=t.value==='1';if(t.id==='pl-pi')st.pi=t.value;if(t.id==='pl-inp')st.inp=t.value;if(t.id==='pl-orl')st.out=t.value;
    if(t.id==='pl-piT')st.piT=+t.value;if(t.id==='pl-inpT')st.inpT=+t.value;if(t.id==='pl-outT')st.outT=+t.value;
    if(t.id==='pl-inpT')st.inp='thr';if(t.id==='pl-outT')st.out='thr';if(t.id==='pl-piT')st.pi='on';
    syncCtl();all()});
  function syncCtl(){
    document.getElementById('pl-inp').value=st.inp;document.getElementById('pl-orl').value=st.out;document.getElementById('pl-pi').value=st.pi;
    ['piT','inpT','outT'].forEach(k=>document.getElementById('pl-'+k+'v').textContent=st[k].toFixed(2));
    const o=document.getElementById('pl-orl');o.disabled=st.sys;if(st.sys&&st.out!=='off'){st.out='off';o.value='off'}
  }
  function outcome(){
    const c=GR.tally(cfgOf());
    document.getElementById('pl-out').innerHTML=RD.stat('Harmful answers delivered',c.harm+' of 200','plus '+c.part+' partial refusals')+
      RD.stat('Unsafe prompts stopped by a rail',c.unsafeStopped,'and '+c.unsafeRefused+' refused by the model')+
      RD.stat('Safe prompts blocked by a rail',c.okBlocked+' of 250',(100*c.okBlocked/250).toFixed(1)+'% over-block')+
      RD.stat('Safe prompts refused by the model',c.okRefused+c.okPartial,c.okRefused+' fully, '+c.okPartial+' partly')+
      RD.stat('Blocked before / after the call',c.blockIn+' / '+c.blockOut,'of 450');
    document.getElementById('pl-out-note').innerHTML=st.sys?'The output rail is off with the system-prompt answers: Qwen3Guard was run on the plain answers only.':'Harmful = full compliance with an unsafe prompt (human label). Rails run in order: injection detector, input rail, output rail; a conversation blocked earlier never reaches a later stage.';
    window.GR.lab=c;
  }
  // trade-off curve
  const cvSeg=document.getElementById('pl-cv-mode');
  cvSeg.innerHTML='<button data-m="inp">Input rail</button><button data-m="out">Output rail</button>';
  cvSeg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.cv=b.dataset.m;curve()});
  const TH=[];for(let t=0.01;t<0.995;t+=0.01)TH.push(+t.toFixed(2));
  function curve(){
    cvSeg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.cv));
    const el=document.getElementById('pl-cv'),w=RD.width(el),h=Math.min(300,Math.max(220,w*0.5)),L=44,B=36,T=10,R=12;
    const mk=m=>st.cv==='inp'?{inp:m}:{out:m};
    const pts=TH.map(t=>{const c=GR.tally(mk(t));return [c.okBlocked/250,c.harm,t]});
    const lo=GR.tally(mk('loose')),hi=GR.tally(mk('strict')),cur=GR.tally(mk(st.cv==='inp'?st.inpT:st.outT));
    const xm=Math.max(0.3,...pts.map(p=>p[0]))*1.05,ym=Math.max(8,Math.ceil(Math.max(...pts.map(p=>p[1]),lo.harm,hi.harm)*1.15/4)*4);
    const sx=x=>L+x/xm*(w-L-R),sy=y=>T+(1-y/ym)*(h-T-B);
    let b='';
    for(let g=0;g<=xm+1e-9;g+=0.1){b+='<line x1="'+sx(g)+'" x2="'+sx(g)+'" y1="'+T+'" y2="'+(h-B)+'" stroke="var(--line)"/>'+RD.t(sx(g),h-B+14,(100*g).toFixed(0)+'%',{fs:10,a:'middle',fill:'var(--mute)'})}
    for(let g=0;g<=ym;g+=ym/4){b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+sy(g)+'" y2="'+sy(g)+'" stroke="var(--line)"/>'+RD.t(L-5,sy(g)+4,g,{fs:10,a:'end',fill:'var(--mute)'})}
    b+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.map(p=>sx(p[0]).toFixed(1)+','+sy(p[1]).toFixed(1)).join(' ')+'"/>';
    b+='<circle cx="'+sx(lo.okBlocked/250)+'" cy="'+sy(lo.harm)+'" r="5" fill="var(--c3)"/>'+RD.t(sx(lo.okBlocked/250)+7,sy(lo.harm)-6,'loose',{fs:10.5});
    b+='<circle cx="'+sx(hi.okBlocked/250)+'" cy="'+sy(hi.harm)+'" r="5" fill="var(--c2)"/>'+RD.t(sx(hi.okBlocked/250)+7,sy(hi.harm)-6,'strict',{fs:10.5});
    b+='<circle cx="'+sx(cur.okBlocked/250)+'" cy="'+sy(cur.harm)+'" r="8" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
    b+=RD.t(L+(w-L-R)/2,h-6,'safe prompts blocked (of 250)',{fs:10.5,a:'middle',fill:'var(--mute)'});
    b+='<text x="12" y="'+(T+(h-T-B)/2)+'" font-size="10.5" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(T+(h-T-B)/2)+')">harmful delivered (of 128)</text>';
    el.innerHTML=RD.svg(w,h,b,'Trade-off between blocked safe prompts and harmful answers delivered');
    const z=pts.find(p=>p[1]===0);
    document.getElementById('pl-cv-note').innerHTML='Thresholds from 0.01 to 0.99 in steps of 0.01, this rail alone. '+(z?'Delivering no harmful answer at all takes a threshold of '+z[2].toFixed(2)+', which blocks '+(100*z[0]).toFixed(1)+'% of safe prompts.':'No threshold in the range delivers zero harmful answers with this rail alone.')+' The curve is a staircase because there are only 128 harmful answers and 250 safe prompts; with this few items, a difference of a few points is within noise ({{Eval statistics|n:3ef5c17b0d0d8187a7b4e5b4ec4a546d}}).'.replace(/\{\{([^|]+)\|n:([0-9a-f]+)\}\}/,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  // conformal risk control on the input-rail score
  const cc=document.getElementById('pl-crc-ctl');
  cc.innerHTML='<label>Target over-block rate &alpha;: <b id="pl-av"></b><input type="range" id="pl-a" min="0.02" max="0.3" step="0.01" value="0.05"></label><div class="rd-btns"><button id="pl-split">New split</button><span class="small mute" id="pl-seed" style="align-self:center"></span></div>';
  // seeded shuffle (mulberry32), reproduced in recompute.py
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const score=x=>x.qpU+x.qpC;
  function crc(){
    const r=mulberry(st.seed),safe=X.filter(x=>!x.unsafe).map(x=>[x,r()]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
    const cal=safe.slice(0,125),test=safe.slice(125),n=cal.length,a=st.alpha;
    // candidate thresholds: every distinct calibration score just above, plus 1.0 (block nothing)
    const cands=[...new Set(cal.map(x=>score(x)))].map(s=>s+1e-9).concat([1.0001]).sort((p,q)=>p-q);
    let lam=1.0001;
    for(const t of cands){const R=cal.filter(x=>score(x)>=t).length/n;if(n/(n+1)*R+1/(n+1)<=a){lam=t;break}}
    const tb=test.filter(x=>score(x)>=lam).length;
    const harm=X.filter(x=>x.unsafe&&x.mi===1),leak=harm.filter(x=>score(x)<lam).length;
    document.getElementById('pl-av').textContent=(100*a).toFixed(0)+'%';
    document.getElementById('pl-seed').textContent='split '+st.seed;
    document.getElementById('pl-crc-out').innerHTML=RD.stat('Chosen threshold',lam>1?'none (block nothing)':lam.toFixed(4),'on P(first label token is not Safe)')+
      RD.stat('Over-block on the 125 test prompts',tb+' ('+(100*tb/125).toFixed(1)+'%)','target '+(100*a).toFixed(0)+'%, in expectation')+
      RD.stat('Harmful answers still delivered',leak+' of '+harm.length,'input rail alone at this threshold');
    document.getElementById('pl-crc-f').innerHTML='Rule (Angelopoulos et al., conformal risk control with a loss bounded by 1): choose the lowest &lambda; with n/(n + 1) &middot; R&#770;(&lambda;) + 1/(n + 1) &le; &alpha;, where R&#770;(&lambda;) is the share of the n = 125 calibration prompts with score &ge; &lambda;. With n = 125 the correction alone is 1/126 = 0.8%, so targets under that are infeasible. The guarantee holds only while new safe traffic is exchangeable with the calibration set; XSTest\'s safe prompts are adversarially borderline, so a real deployment would calibrate on its own benign traffic.';
    document.getElementById('pl-crc').dataset.lam=lam;
  }
  document.getElementById('pl-a').addEventListener('input',e=>{st.alpha=+e.target.value;crc()});
  document.getElementById('pl-split').addEventListener('click',()=>{st.seed++;crc()});
  // injection set
  const dc=document.getElementById('pl-dp-ctl');
  dc.innerHTML='<label>DeBERTa threshold: <b id="pl-dpv"></b><input type="range" id="pl-dpT" min="0.001" max="0.99" step="0.001" value="0.5"></label>';
  document.getElementById('pl-dpT').addEventListener('input',e=>{st.dpT=+e.target.value;inj()});
  function inj(){
    const t=st.dpT,inj=DP.filter(d=>d.inj),ben=DP.filter(d=>!d.inj);
    const tp=inj.filter(d=>d.pi>=t).length,fp=ben.filter(d=>d.pi>=t).length,xf=X.filter(x=>x.pi>=t).length;
    const qs=inj.filter(d=>d.q!=='S').length,qsb=ben.filter(d=>d.q!=='S').length,qu=inj.filter(d=>d.q==='U').length,qub=ben.filter(d=>d.q==='U').length,jb=DP.filter(d=>d.jb).length;
    document.getElementById('pl-dpv').textContent=t.toFixed(3);
    document.getElementById('pl-dp-out').innerHTML=RD.stat('DeBERTa: injections caught',tp+' of '+inj.length,(100*tp/inj.length).toFixed(0)+'% recall')+
      RD.stat('DeBERTa: benign flagged',fp+' of '+ben.length,'deepset benign items')+
      RD.stat('DeBERTa: XSTest prompts flagged',xf+' of 450','same threshold')+
      RD.stat('Qwen3Guard: injections flagged',qu+' loose / '+qs+' strict','of '+inj.length+'; benign '+qub+' / '+qsb+' of '+ben.length+'; Jailbreak category on '+jb);
    document.getElementById('pl-dp-list').innerHTML=DP.map(d=>'<div class="xs-row"><span class="xs-dots">'+(d.inj?'<span class="pill no">injection</span>':'<span class="pill ok">benign</span>')+' <span class="pill'+(d.pi>=t?' no':'')+'">DeBERTa '+d.pi.toFixed(3)+'</span> <span class="pill'+(d.q!=='S'?' no':'')+'">Qwen '+d.q+'</span></span><span>'+esc(d.text)+'</span></div>').join('');
  }
  // refusal flag against human labels
  function refusal(){
    const L={1:'full compliance',2:'full refusal',3:'partial refusal'};
    const m={};X.forEach(x=>{const k=x.mi+'_'+x.qrRef;m[k]=(m[k]||0)+1});
    document.getElementById('pl-ref').innerHTML='<table class="rd-t"><thead><tr><th>Human label</th><th class="num">Guard: refusal</th><th class="num">Guard: not a refusal</th></tr></thead><tbody>'+
      [1,2,3].map(h=>'<tr><td>'+L[h]+'</td><td class="num">'+(m[h+'_1']||0)+'</td><td class="num">'+(m[h+'_0']||0)+'</td></tr>').join('')+'</tbody></table>';
    const ex=X.filter(x=>x.mi===2&&x.qrRef===0&&x.miEx).slice(0,3);
    document.getElementById('pl-ref-note').innerHTML='Most of the disagreement is definitional: XSTest\'s annotators count an answer that rejects the question\'s premise as a refusal; the guard does not. Examples (human: full refusal; guard: not a refusal): '+ex.map(x=>'#'+x.id+' "'+esc(x.miEx)+'"').join('; ')+'. Qwen reports refusal-detection F1 of 93.3 on XSTest for this model size, on its own answer set (Qwen-run).';
  }
  // every conversation
  const FL=[['all','All 450'],['harm','Harmful delivered'],['okb','Safe prompt blocked'],['caught','Unsafe stopped by a rail'],['safe','Safe prompts'],['unsafe','Unsafe prompts']];
  const fl=document.getElementById('pl-flt');
  fl.innerHTML=FL.map(([k,n])=>'<button data-f="'+k+'">'+n+'</button>').join('');
  fl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.flt=b.dataset.f;list()});
  const HL={1:'complied',2:'refused',3:'partly refused'};
  function list(){
    fl.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.f===st.flt));
    const cfg=cfgOf();
    const rows=X.map(x=>[x,GR.outcome(x,cfg)]).filter(([x,o])=>st.flt==='all'||(st.flt==='safe'&&!x.unsafe)||(st.flt==='unsafe'&&x.unsafe)||
      (st.flt==='harm'&&x.unsafe&&o.res==='answer')||(st.flt==='okb'&&!x.unsafe&&o.res==='blocked')||(st.flt==='caught'&&x.unsafe&&o.res==='blocked'));
    const ans=x=>cfg.sys?x.mg:x.mi,exx=x=>cfg.sys?x.mgEx:x.miEx;
    document.getElementById('pl-list').innerHTML='<div class="small mute" style="padding:2px 4px">'+rows.length+' conversations</div>'+rows.map(([x,o])=>{
      const v=[];if(cfg.pi!==false)v.push('inj '+x.pi.toFixed(2));if(cfg.inp)v.push('in '+x.qp);if(cfg.out)v.push('out '+x.qr);
      const res=o.res==='blocked'?'<span class="pill '+(x.unsafe?'ok':'no')+'">blocked '+(o.st==='out'?'after':'before')+'</span>':(x.unsafe&&o.res==='answer'?'<span class="pill no">harmful</span>':'<span class="pill">'+HL[ans(x)]+'</span>');
      return '<div class="xs-row"><span class="xs-dots"><span class="pill'+(x.unsafe?' no':'')+'">'+(x.unsafe?'unsafe':'safe')+' #'+x.id+'</span> '+res+'</span><span><b>'+esc(x.prompt)+'</b> <span class="mute small">'+esc(x.type.replace(/_/g,' '))+'; model '+HL[ans(x)]+(v.length?'; '+v.join(', '):'')+'</span>'+(exx(x)?'<br><span class="small mute">'+esc(exx(x))+'</span>':'')+'</span></div>'}).join('');
  }
  function all(){outcome();curve();list()}
  syncCtl();all();crc();inj();refusal();
  RD.onRender(()=>{curve()},TAB);RD.onResize(curve,TAB);
})();
