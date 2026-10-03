// ---- Open recipes compared: tokens per stage, disclosure by stage, stage order, compute animation, corrections ----
(function(){
  if(!window.RC)return;
  const {D,R,COLS,shownRows,esc,fmtN,dfmt,KN,seqHTML}=window.RC;
  const $=id=>document.getElementById(id);
  const A='target="_blank" rel="noopener noreferrer"';
  const SC={pt:'var(--c1)',mid:'var(--c6)',lc:'var(--c5)',sft:'var(--c3)',pref:'var(--c4)',rl:'var(--c2)',post:'var(--c2)'};
  const byDate=rs=>rs.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.k-b.k);
  const NS='http://www.w3.org/2000/svg';
  // ---------- tokens per stage ----------
  const LO=7,HI=14,TK=['10M','100M','1B','10B','100B','1T','10T','100T'];
  function stagesOf(r){const c=r.cells,o=[];
    const p=c.pt_tokens;if(p.n!=null)o.push({s:'pt',v:p.n,h:p.kind==='inh',l:'pretraining'});
    const m=c.mid_tokens;if(m.n!=null&&m.kind!=='nd')o.push({s:'mid',v:m.n,h:m.kind==='inh',l:'mid-training'});
    const x=c.ctx;if(x.tok!=null&&!(m.n!=null&&Math.abs(m.n-x.tok)/x.tok<0.01))o.push({s:'lc',v:x.tok,h:false,l:'long context'});
    const f=c.sft;if(f.tok!=null)o.push({s:'sft',v:f.tok,h:false,l:'SFT (tokens)'});
    return o}
  function mark(s,x,y,col,hollow){const r=5;const fill=hollow?'var(--bg)':col;const a='fill="'+fill+'" stroke="'+col+'" stroke-width="1.5"';
    if(s==='pt')return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" '+a+'/>';
    if(s==='mid')return '<path d="M'+x+' '+(y-6)+'L'+(x+6)+' '+y+'L'+x+' '+(y+6)+'L'+(x-6)+' '+y+'Z" '+a+'/>';
    if(s==='lc')return '<path d="M'+x+' '+(y-6)+'L'+(x+6)+' '+(y+5)+'L'+(x-6)+' '+(y+5)+'Z" '+a+'/>';
    return '<rect x="'+(x-4.5)+'" y="'+(y-4.5)+'" width="9" height="9" '+a+'/>'}
  function tokens(){const el=$('rc-tok');if(!el||!el.clientWidth)return;
    const rs=byDate(shownRows());
    let h='<div class="tkrow tkax"><span></span><div class="trk"></div></div>'+rs.map(r=>'<div class="tkrow"><span class="nm" title="'+esc(r.model)+'">'+esc(r.model)+'</span><div class="trk" data-k="'+r.k+'"></div></div>').join('');
    h+='<div class="hmleg" style="margin-top:6px">'+[['pt','pretraining'],['mid','mid-training / CPT'],['lc','context extension'],['sft','SFT (tokens)']].map(s=>'<span><svg width="14" height="14" viewBox="-7 -7 14 14">'+mark(s[0],0,0,SC[s[0]],false)+'</svg>'+s[1]+'</span>').join('')+'<span><svg width="14" height="14" viewBox="-7 -7 14 14">'+mark('pt',0,0,SC.pt,true)+'</svg>inherited</span></div>';
    el.innerHTML=h;
    const tr=el.querySelector('.trk');const W=Math.max(120,tr.clientWidth),pad=8,X=v=>pad+(Math.log10(v)-LO)/(HI-LO)*(W-2*pad);
    const step=W<300?2:1;
    tr.innerHTML='<svg width="'+W+'" height="18" viewBox="0 0 '+W+' 18">'+TK.map((t,i)=>i%step?'':'<text x="'+X(Math.pow(10,LO+i))+'" y="12" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>').join('')+'</svg>';
    el.querySelectorAll('.trk[data-k]').forEach(t=>{const r=R[+t.dataset.k],st=stagesOf(r);
      let s='<svg width="'+W+'" height="20" viewBox="0 0 '+W+' 20">';
      for(let i=0;i<TK.length;i++)s+='<line x1="'+X(Math.pow(10,LO+i))+'" x2="'+X(Math.pow(10,LO+i))+'" y1="2" y2="18" stroke="var(--line)"/>';
      if(st.length>1){const xs=st.map(o=>X(o.v));s+='<line x1="'+Math.min(...xs)+'" x2="'+Math.max(...xs)+'" y1="10" y2="10" stroke="var(--dim)" stroke-width="2"/>'}
      st.forEach(o=>{s+='<g><title>'+esc(r.model+': '+o.l+' '+fmtN(o.v)+' tokens'+(o.h?' (inherited)':''))+'</title>'+mark(o.s,X(o.v),10,SC[o.s],o.h)+'</g>'});
      if(!st.length)s+='<text x="'+pad+'" y="14" font-size="10.5" fill="var(--bad)">no token count disclosed</text>';
      t.innerHTML=s+'</svg>'});
    const both=rs.map(r=>{const st=stagesOf(r),p=st.find(o=>o.s==='pt'),f=st.find(o=>o.s==='sft');return p&&f?[r.model,p.v/f.v]:null}).filter(Boolean);
    const nd=rs.filter(r=>r.cells.mid_tokens.kind==='nd').length;
    $('rc-tok-cap').innerHTML=(both.length?'Where both are known, pretraining is '+both.map(b=>esc(b[0])+' <b>'+Math.round(b[1]).toLocaleString('en-US')+'&times;</b>').join(', ')+' the SFT tokens. '+(both.some(b=>b[1]>1000)?'For most recipes SFT is a rounding error in tokens, which is why post-training data is counted in examples and pretraining in trillions'+(both.some(b=>b[1]<100)?'; K2 Horizon, with 332B tokens of SFT run after RL, is the exception':'')+'. ':''):'')+nd+' of the '+rs.length+' rows shown do not disclose a mid-training token count; no row discloses its RL tokens as a total.'}
  // ---------- which stages labs disclose ----------
  let era='all';
  const KO=['pub','der','unc','inh','none','nd'];
  const KC={pub:'var(--acc)',der:'color-mix(in srgb,var(--acc) 45%,var(--bg))',unc:'color-mix(in srgb,var(--bad) 55%,var(--bg))',inh:'var(--dim)',none:'var(--soft)',nd:'repeating-linear-gradient(135deg,var(--bad) 0 3px,color-mix(in srgb,var(--bad) 30%,var(--bg)) 3px 6px)'};
  function disc(){const el=$('rc-disc');if(!el)return;
    const rs=shownRows().filter(r=>era==='all'||(era==='old')===(r.date<'2025'));
    if(!rs.length){el.innerHTML='<p class="mute">No rows match.</p>';$('rc-disc-cap').textContent='';return}
    let worst=null;
    el.innerHTML=COLS.filter(c=>c.grp!=='Openness').map(c=>{const n={};KO.forEach(k=>n[k]=0);rs.forEach(r=>n[r.cells[c.id].kind]++);
      const ap=rs.length-n.none-n.inh,pc=ap?Math.round(100*(n.pub+n.der)/ap):null;
      if(pc!=null&&(!worst||pc<worst[1]))worst=[c,pc];
      const tt=KO.filter(k=>n[k]).map(k=>KN[k]+' '+n[k]).join(', ');
      return '<div class="dsrow"><span>'+esc(c.name)+' <span class="mute">'+esc(c.grp==='Pretraining'?'PT':c.grp==='Mid-training'?'mid':c.grp==='Post-training'?'post':c.grp==='Compute'?'cost':'open')+'</span></span><span class="dsbar" title="'+esc(tt)+'" role="img" aria-label="'+esc(c.name+': '+tt)+'">'+KO.filter(k=>n[k]).map(k=>'<span style="width:'+(100*n[k]/rs.length)+'%;background:'+KC[k]+'"></span>').join('')+'</span><span class="pc">'+(pc==null?'n/a':pc+'%')+'</span></div>'}).join('')+
      '<div class="hmleg" style="margin-top:6px">'+KO.map(k=>'<span><i class="lg" style="background:'+KC[k]+'"></i>'+KN[k]+'</span>').join('')+'<span>right: published or derived, as a share of rows where the stage applies</span></div>';
    $('rc-disc-cap').innerHTML=rs.length+' rows. Least disclosed where it applies: <b>'+esc(worst[0].grp+', '+worst[0].name)+'</b> at '+worst[1]+'%. Compare <i>Before 2025</i> with <i>2025 on</i>: pretraining token counts stay public, while post-training sizes and compute are where reports go quiet.'}
  document.querySelectorAll('#rc-era button').forEach(b=>b.addEventListener('click',()=>{era=b.dataset.v;document.querySelectorAll('#rc-era button').forEach(x=>x.classList.toggle('on',x===b));disc()}));
  // ---------- stage order ----------
  function seq(){const el=$('rc-seq');if(!el)return;
    el.innerHTML=byDate(shownRows()).map(r=>'<div class="sqrow"><span class="nm">'+esc(r.model)+'<small>'+esc(r.lab)+', '+dfmt(r.date)+'</small></span>'+seqHTML(r)+'</div>').join('')||'<p class="mute">No rows match.</p>'}
  // ---------- compute animation ----------
  const ST=D.stories;let si=1,bi=ST[1].branches.length-1,step=-1,playing=false,timer=null,tw=1,raf=null;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPost=s=>!['pt','mid','lc'].includes(s);
  const stagesFor=(s,b)=>s.shared.concat(s.branches[b].stages);
  const tot=a=>a.reduce((x,y)=>x+y[2],0);
  const fmtU=(s,v)=>{const x=v*s.scale;return (x>=100?Math.round(x).toLocaleString('en-US'):(+x.toFixed(1)).toLocaleString('en-US'))+' '+s.unit};
  function segBtns(){$('rc-an-s').innerHTML=ST.map((s,i)=>'<button data-i="'+i+'"'+(i===si?' class="on"':'')+'>'+esc(s.name)+'</button>').join('');
    $('rc-an-s').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{si=+b.dataset.i;bi=ST[si].branches.length-1;stop();step=-1;segBtns();anim()}));
    const s=ST[si];$('rc-an-b').innerHTML=s.branches.length>1?s.branches.map((b,i)=>'<button data-i="'+i+'"'+(i===bi?' class="on"':'')+'>'+esc(b.name)+'</button>').join(''):'';
    $('rc-an-b').style.display=s.branches.length>1?'':'none';
    $('rc-an-b').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{bi=+b.dataset.i;segBtns();anim()}))}
  function anim(){const el=$('rc-an-svg');if(!el)return;const s=ST[si],sts=stagesFor(s,bi),n=sts.length;
    if(step<0||step>n)step=n;const scr=$('rc-an-scr');scr.max=n;scr.value=step;
    const maxT=Math.max(...s.branches.map((b,i)=>tot(stagesFor(s,i))));
    const maxP=Math.max(...s.branches.map((b,i)=>tot(stagesFor(s,i).filter(x=>isPost(x[0])))));
    const shown=sts.slice(0,step),cum=tot(shown),post=tot(shown.filter(x=>isPost(x[0]))),all=tot(sts);
    $('rc-an-out').innerHTML='<div class="stat"><div class="k">Compute so far</div><div class="v">'+esc(fmtU(s,cum))+'</div><div class="d">of '+esc(fmtU(s,all))+' for '+esc(s.branches[bi].name)+'</div></div>'+
      '<div class="stat"><div class="k">Post-training so far</div><div class="v">'+esc(fmtU(s,post))+'</div><div class="d">every stage after the base model</div></div>'+
      '<div class="stat"><div class="k">Post-training share</div><div class="v">'+(cum?(100*post/cum).toFixed(post/cum<0.01?2:1)+'%':'0%')+'</div><div class="d">'+(step===n?'of the whole run':'of the compute so far')+'</div></div>';
    const W=Math.max(200,el.clientWidth||0);if(!el.clientWidth){return}
    const mag=Math.max(1,Math.round(maxT/maxP));
    const X1=v=>v/maxT*(W-2),X2=v=>v/maxP*(W-2);
    let g='<svg width="'+W+'" height="104" viewBox="0 0 '+W+' 104"><text x="0" y="12" font-size="11" fill="var(--mute)">Whole run, to scale</text>';
    g+='<rect x="1" y="17" width="'+(W-2)+'" height="24" fill="none" stroke="var(--line)" rx="3"/>';
    let x=1;shown.forEach((t,i)=>{const fr=(i===shown.length-1)?tw:1,w=X1(t[2])*fr;g+='<rect x="'+x+'" y="17" width="'+Math.max(w,t[2]>0?0.8:0)+'" height="24" fill="'+SC[t[0]]+'"><title>'+esc(t[1]+': '+fmtU(s,t[2]))+'</title></rect>';x+=w});
    const tl=X1(all)+1;g+='<line x1="'+tl+'" x2="'+tl+'" y1="13" y2="45" stroke="var(--ink)" stroke-dasharray="2 2"/>';
    g+='<text x="0" y="64" font-size="11" fill="var(--mute)">Post-training only, magnified '+mag.toLocaleString('en-US')+'&#215;</text>';
    g+='<rect x="1" y="69" width="'+(W-2)+'" height="24" fill="none" stroke="var(--line)" rx="3"/>';
    x=1;shown.forEach((t,i)=>{if(!isPost(t[0]))return;const fr=(i===shown.length-1)?tw:1,w=X2(t[2])*fr;g+='<rect x="'+x+'" y="69" width="'+w+'" height="24" fill="'+SC[t[0]]+'" stroke="var(--bg)" stroke-width="1"><title>'+esc(t[1]+': '+fmtU(s,t[2]))+'</title></rect>';x+=w});
    const pl=X2(tot(sts.filter(t=>isPost(t[0]))))+1;g+='<line x1="'+pl+'" x2="'+pl+'" y1="65" y2="97" stroke="var(--ink)" stroke-dasharray="2 2"/>';
    el.innerHTML=g+'</svg>';
    $('rc-an-list').innerHTML=sts.map((t,i)=>{const c=i===step-1?'cur':i>=step?'fut':'';return '<span class="'+c+'"><i style="background:'+SC[t[0]]+'"></i></span><span class="'+c+'">'+esc(t[1])+'</span><span class="v '+c+'">'+esc(fmtU(s,t[2]))+' ('+(100*t[2]/all).toFixed(t[2]/all<0.01?2:1)+'%)</span>'}).join('');
    let cap;if(step===0)cap='Press play, or step forward, to lay the run out one stage at a time. The dashed lines mark where this recipe ends on each bar.';
    else{const t=sts[step-1];cap='<b>'+esc(t[1])+'</b>: '+esc(fmtU(s,t[2]))+', '+(100*t[2]/all).toFixed(t[2]/all<0.01?2:1)+'% of the run.'+(isPost(t[0])?' On the top bar it is '+(X1(t[2])<2?'under two pixels wide; the lower bar magnifies it '+mag.toLocaleString('en-US')+' times.':(X1(t[2])).toFixed(0)+' pixels wide.'):'')+(step===n?' '+esc(s.note):'')}
    $('rc-an-cap').innerHTML=cap;
    $('rc-an-src').innerHTML='Source: <a href="'+esc(s.src)+'" '+A+'>'+esc(s.srcl)+'</a>. Bars drawn to one scale for every option of this recipe, so switching options compares like with like.';
    $('rc-an-play').innerHTML=playing?'&#10074;&#10074; Pause':'&#9654; Play'}
  function tween(){if(reduce){tw=1;anim();return}const t0=performance.now(),d=650/(+$('rc-an-sp').value);cancelAnimationFrame(raf);
    const f=now=>{tw=Math.max(0,Math.min(1,(now-t0)/d));anim();if(tw<1)raf=requestAnimationFrame(f)};raf=requestAnimationFrame(f)}
  function go(k){const n=stagesFor(ST[si],bi).length;step=Math.max(0,Math.min(n,k));tw=0;tween()}
  function stop(){playing=false;clearTimeout(timer);anim()}
  function tick(){if(!playing)return;const n=stagesFor(ST[si],bi).length;if(step>=n){stop();return}
    if(!visible()){timer=setTimeout(tick,400);return}go(step+1);timer=setTimeout(tick,1700/(+$('rc-an-sp').value))}
  let onScreen=true;
  const visible=()=>onScreen&&!$('t-recipes').hidden&&!document.hidden;
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{onScreen=es[0].isIntersecting}).observe($('rc-an-svg'))}
  $('rc-an-play').addEventListener('click',()=>{if(playing){stop();return}const n=stagesFor(ST[si],bi).length;if(step>=n)step=0;playing=true;anim();tick()});
  $('rc-an-fwd').addEventListener('click',()=>{stop();go(step+1)});
  $('rc-an-back').addEventListener('click',()=>{stop();step=Math.max(0,step-1);tw=1;anim()});
  $('rc-an-scr').addEventListener('input',e=>{stop();step=+e.target.value;tw=1;anim()});
  // ---------- post-training share bars ----------
  function share(){const el=$('rc-share');if(!el)return;
    const rows=[];ST.forEach(s=>s.branches.forEach((b,i)=>{const a=stagesFor(s,i),t=tot(a),p=tot(a.filter(x=>isPost(x[0])));rows.push([b.name,p/t,fmtU(s,p)+' of '+fmtU(s,t)])}));
    const mx=Math.max(...rows.map(r=>r[1]));
    el.innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track" title="'+esc(r[2])+'"><span class="fill" style="width:'+Math.max(1,100*r[1]/mx)+'%;background:var(--c2)"></span></span><span class="val">'+(100*r[1]).toFixed(r[1]<0.01?2:1)+'%</span></div>').join('');
    $('rc-share-cap').innerHTML='Each share is post-training compute over the whole run behind the model, from the same figures as the animation (the Olmo values are derived from stage durations). The direction is clear from these three families, but they are not a sample of the field: Meta, Alibaba, Google and Moonshot report no post-training compute at all, and Xiaomi prices MiMo-V2.6-Pro\'s final RL at $2.6M without the pretraining figure that would make it a share.'}
  // ---------- corrections ----------
  function corr(){const el=$('rc-corr');if(!el)return;
    el.innerHTML=D.corrections.map(c=>'<details class="mist"><summary>'+esc(c.claim)+' <span class="mute small">('+esc(c.where)+')</span></summary><div class="b">'+esc(c.primary)+' <a href="'+esc(c.src)+'" '+A+'>Source</a>.</div></details>').join('')}
  function render(){tokens();disc();seq();anim();share()}
  segBtns();corr();share();
  window.RC.onChange(()=>{try{render()}catch(e){window.__jsErr&&window.__jsErr('recipes charts: '+e.message)}});
  try{render()}catch(e){window.__jsErr&&window.__jsErr('recipes charts: '+e.message)}
  let rt=null;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-recipes').hidden){tokens();anim()}},120)});
})();
