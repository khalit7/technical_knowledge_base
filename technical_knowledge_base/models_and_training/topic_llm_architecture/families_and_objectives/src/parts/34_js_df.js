// ---- Reading sections 4 and 8 (moved from the old Diffusion lab tab): AR against diffusion on one prompt, quality against steps, fill-in, adaptation curve ----
(function(){
  if(!window.FOD||!document.getElementById('df-card'))return;
  const D=FOD.diff,esc=FO.esc,t=RD.t,TAB='t-read',G=48,Pn=D.prompt_tokens;
  const clean=s=>s.replace(/\n/g,'↵');
  document.getElementById('df-prompt').textContent='Prompt ('+Pn+' tokens with <|endoftext|>): '+D.trace_prompt;
  let mode='12';
  const nsteps=()=>mode==='ar'?G:D.trace[mode].steps.length;
  function draw(i){
    const cells=[];let commitNow=new Set(),done=new Set();
    if(mode==='ar'){const f=D.trace.ar.final;for(let j=0;j<G;j++)cells.push(j<=i?(j===i?['n',f[j]]:['c',f[j]]):['m','']);}
    else{const st=D.trace[mode].steps;for(let s=0;s<i;s++)st[s].commit.forEach(p=>done.add(p));st[i].commit.forEach(p=>commitNow.add(p));
      const fin=D.trace[mode].final,g=st[i].guess;
      for(let j=0;j<G;j++)cells.push(done.has(j)?['c',fin[j]]:commitNow.has(j)?['n',fin[j]]:['m',g[j]])}
    document.getElementById('df-grid').innerHTML=cells.map(c=>'<span class="'+c[0]+'" title="'+esc(c[1])+'">'+esc(clean(c[1]))+'</span>').join('');
    const fwd=i+1,committed=mode==='ar'?i+1:done.size+commitNow.size;
    const proc=mode==='ar'?Pn+i:fwd*(Pn+G);
    let cap;
    if(mode==='ar')cap='Forward '+fwd+': the causal model reads only the newest token (its earlier keys and values are cached) and commits one token. It cannot revise anything.';
    else{const st=D.trace[mode].steps[i],cf=st.commit.map(p=>st.conf[p]);
      cap='Step '+fwd+' of '+nsteps()+': every masked slot is predicted at once; the '+st.commit.length+' most confident (confidence '+Math.min(...cf).toFixed(2)+' to '+Math.max(...cf).toFixed(2)+') are committed and the rest stay masked for the next step, guesses discarded.'}
    document.getElementById('df-cap').innerHTML='<p>'+cap+'</p>';
    document.getElementById('df-cnt').innerHTML=RD.stat('forwards',fwd,'of '+nsteps())+RD.stat('tokens committed',committed+' / '+G,'')+RD.stat('tokens per forward',(committed/fwd).toFixed(1),'')+RD.stat('token positions processed',proc.toLocaleString('en-US'),mode==='ar'?'prefill + 1 per step':fwd+' x '+(Pn+G));
  }
  const A=FO.anim({card:'df-card',ctl:'df-ctl',n:nsteps(),draw,ms:700,label:'Step',tab:TAB});
  RD.seg(document.getElementById('df-seg'),m=>{mode=m;A.reset(nsteps())});
  const S=D.summary,ord=[['ar_greedy','causal, greedy',48],['ar_t0.8','causal, T 0.8',48],['diff_48_low','diffusion 48',48],['diff_24_low','diffusion 24',24],['diff_12_low','diffusion 12',12],['diff_6_low','diffusion 6',6],['diff_3_low','diffusion 3',3]].filter(r=>S[r[0]]);
  function quality(){
    const el=document.getElementById('df-q-svg'),W=Math.min(FO.W(el),720),lab=W<460?96:130,rh=24,H=ord.length*rh+44;
    const vals=ord.map(r=>S[r[0]].judge_loss),mx=Math.max(...vals)*1.08,X=v=>lab+(W-lab-56)*v/mx;let b='';
    ord.forEach((r,i)=>{const v=S[r[0]].judge_loss,y=6+i*rh;b+=t(lab-6,y+15,r[1],{a:'end',fs:11})+'<rect x="'+lab+'" y="'+(y+3)+'" width="'+(X(v)-lab)+'" height="'+(rh-8)+'" rx="2" fill="'+(r[0].startsWith('ar')?'var(--c1)':'var(--c2)')+'"/>'+t(X(v)+4,y+15,v.toFixed(2),{fs:11})});
    ['diff_48_random','diff_12_random'].forEach((k,j)=>{if(!S[k])return;const v=S[k].judge_loss,y=6+ord.findIndex(r=>r[0]===(j?'diff_12_low':'diff_48_low'))*rh;b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(y+1)+'" y2="'+(y+rh-3)+'" stroke="var(--bad)" stroke-width="3"/>'});
    el.innerHTML=RD.svg(W,H,b,'quality against steps');
    document.getElementById('df-q-cap').innerHTML='<p class="small mute">Judge loss per token (SmolLM2-135M), lower is more fluent; red tick: random remasking at the same number of steps.</p><p>48 steps commit one token per forward like the causal model, but in confidence order; 3 steps commit 16 at a time. Random remasking (red ticks): '+
      (S.diff_48_random?S.diff_48_random.judge_loss.toFixed(2)+' at 48 steps, ':'')+(S.diff_12_random?S.diff_12_random.judge_loss.toFixed(2)+' at 12':'')+'.</p>';
  }
  const NM={ar_greedy:'causal, greedy','ar_t0.8':'causal, sampled T 0.8',diff_48_low:'diffusion, 48 steps',diff_12_low:'diffusion, 12 steps',diff_6_low:'diffusion, 6 steps',diff_3_low:'diffusion, 3 steps',diff_12_random:'diffusion, 12 steps, random order'};
  document.querySelector('#df-g-tab tbody').innerHTML=Object.keys(NM).filter(k=>D.gens7[k]!=null).map(k=>'<tr><td>'+NM[k]+'</td><td>'+esc(D.gens7[k].trim())+'</td></tr>').join('');
  function fill(){
    const el=document.getElementById('df-f-svg'),W=Math.min(FO.W(el),640),H=180,l=40,bt=28,F=D.fill_in,ks=Object.keys(F),bw=(W-l-10)/ks.length,Y=v=>8+(H-8-bt)*(1-v);let b='';
    for(const v of [0,0.25,0.5,0.75]){b+='<line x1="'+l+'" x2="'+(W-10)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,Math.round(v*100)+'%',{a:'end'})}
    ks.forEach((k,i)=>{const f=F[k],x=l+i*bw;
      b+='<rect x="'+(x+bw*0.14)+'" y="'+Y(f.diffusion_top1)+'" width="'+bw*0.33+'" height="'+(Y(0)-Y(f.diffusion_top1))+'" fill="var(--c2)"/>'+t(x+bw*0.305,Y(f.diffusion_top1)-4,Math.round(100*f.diffusion_top1)+'%',{a:'middle',fs:11});
      b+='<rect x="'+(x+bw*0.53)+'" y="'+Y(f.causal_top1)+'" width="'+bw*0.33+'" height="'+(Y(0)-Y(f.causal_top1))+'" fill="var(--c1)"/>'+t(x+bw*0.695,Y(f.causal_top1)-4,Math.round(100*f.causal_top1)+'%',{a:'middle',fs:11});
      b+=t(x+bw/2,H-10,k.slice(1)+'% hidden',{a:'middle',fs:11})});
    el.innerHTML=RD.svg(W,H,b,'fill in the blanks')+'<div class="fo-leg"><span style="--sw:var(--c2)">bidirectional (diffusion model as an MLM)</span><span style="--sw:var(--c1)">causal reference, true left context</span></div>';
  }
  function curve(){
    const el=document.getElementById('df-t-svg'),W=Math.min(FO.W(el),640),H=170,l=36,bt=26,E=D.train.eval,mx=E[E.length-1][0],top=Math.ceil(E[0][1]),X=v=>l+(W-l-10)*v/mx,Y=v=>8+(H-8-bt)*(1-(v-3)/(top-3));let b='';
    for(let v=3;v<=top;v++){b+='<line x1="'+l+'" x2="'+(W-10)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v,{a:'end'})}
    for(const v of [0,500,1000,1500,2000,3000,4500])if(v<=mx&&(mx<=1500||v%1000!==500))b+=t(X(v),H-10,v,{a:v===mx?'end':'middle'});
    b+='<polyline points="'+E.map(e=>X(e[0])+','+Y(e[1])).join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    el.innerHTML=RD.svg(W,H,b,'adaptation curve')+'<div class="fo-leg"><span style="--sw:var(--c2)">held-out bound: '+E[0][1].toFixed(2)+' at step 0, '+E[E.length-1][1].toFixed(2)+' at step '+mx+'</span></div>';
  }
  FO.reg(TAB,()=>{quality();fill();curve()});
  RD.onResize(()=>{quality();fill();curve()});
})();
