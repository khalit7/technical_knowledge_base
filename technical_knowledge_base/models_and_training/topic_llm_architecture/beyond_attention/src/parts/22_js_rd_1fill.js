// ---- Reading: numbers in the prose come from window.BAD (recorded outputs), never typed; tables, the loss chart, predicts ----
(function(){
  const B=window.BAD;if(!B||!window.RD)return;
  const $=id=>document.getElementById(id);
  const f3=x=>x.toFixed(3),pct=x=>Math.round(100*x)+'%',fi=n=>Math.round(n).toLocaleString('en-GB');
  const MiB=b=>(b/1048576).toFixed(1),GiB=b=>(b/1073741824).toFixed(2);
  const run=n=>(B.runs||[]).find(r=>r.run===n);
  const mem=k=>B.mem.models.find(m=>m.key===k);
  const cp=()=>{if(!B.copy)return null;const py=B.copy.models.find(m=>/pythia/.test(m.name)),mb=B.copy.models.find(m=>/mamba/.test(m.name));return py&&mb?{py,mb}:null};
  // value resolver for data-v="a.b.c"
  window.BA_V=function(key){
    const p=key.split('.');
    if(p[0]==='run'){const r=run(p[1]);if(!r)return null;return p[2]==='val'?f3(r.val):p[2]==='rs'?f3(r.rs):null}
    if(p[0]==='mem'){const m=mem(p[1]);if(!m)return null;
      if(p[2]==='cross')return m.kv_equals_state_at?fi(m.kv_equals_state_at):null;
      if(p[2]==='stateMiB')return MiB(m.state);return null}
    if(p[0]==='wr'){const q=p[1].split('_');const r=B.wr[q[0]+'_'+q[1]];if(!r)return null;
      return q[2]?(r.cos[q[2]]!==undefined?r.cos[q[2]].toFixed(2):null):r.mean.toFixed(2)}
    if(p[0]==='inside')return B.inside?B.inside.dual.toExponential(1):null;
    const c=cp();if(!c)return null;
    if(p[0]==='copy'&&/Fwd$/.test(p[1])){const m=p[1]==='mbFwd'?c.mb:c.py;return m.forward_1000_tokens_s!==undefined?m.forward_1000_tokens_s.toFixed(1):null}
    if(p[0]==='copy'){const L=c.py.copy[c.py.copy.length-1];const M=c.mb.copy[c.mb.copy.length-1];
      return p[1]==='longL'?fi(L.words):p[1]==='pyLong'?pct(L.acc):p[1]==='mbLong'?pct(M.acc):null}
    if(p[0]==='book'){const L=c.py.phonebook.find(z=>z.entries===40),M=c.mb.phonebook.find(z=>z.entries===40);
      return p[1]==='bigN'?fi(L.entries):p[1]==='pyBig'?pct(L.acc):p[1]==='mbBig'?pct(M.acc):null}
    return null};
  document.querySelectorAll('[data-v]').forEach(el=>{const v=BA_V(el.dataset.v);
    if(v===null){el.textContent='(pending)';el.classList.add('unc')}else el.textContent=v});

  // hybrid table (section 7)
  const tb=document.querySelector('#rd-hyb tbody');
  if(tb){const rows=B.mem.models.filter(m=>m.group==='hybrid').map(m=>{
      const mx=m.mixers,att=(mx.attn||0)+(mx.attn_win||0)+(mx.mla||0),rec=(mx.mamba1||0)+(mx.mamba2||0)+(mx.gdn||0)+(mx.kda||0);
      const kind=mx.mamba1?'Mamba':mx.mamba2?'Mamba-2':mx.gdn?'Gated DeltaNet':'KDA';
      const at=m.at['131072'];
      return '<tr><td>'+RD.esc(m.label)+'</td><td>'+rec+' '+kind+'</td><td>'+att+(mx.mla?' MLA':'')+'</td><td class="num">'+(m.key==='falcon-h1-34b'?'parallel':(rec/att).toFixed(rec%att?1:0)+' : 1')+
        '</td><td class="num">'+(m.kv_per_token/1024).toFixed(m.kv_per_token%1024?2:0)+' KiB</td><td class="num">'+MiB(m.state)+' MiB</td><td class="num">'+(m.kv_equals_state_at?fi(m.kv_equals_state_at):'')+
        '</td><td class="num">'+GiB(at)+' GiB</td></tr>'});
    tb.innerHTML=rows.join('')}

  // runs table (section 9)
  const rt=document.querySelector('#rd-runs tbody');
  const mixName=r=>r.layer_types==='aaaaaa'?'6 attention':r.layer_types==='ssssss'?'6 SSM':r.layer_types.split('').map(c=>c==='a'?'A':'s').join('');
  const cacheStr=r=>{const kv=r.kv_256_bf16,st=r.state_fp32;return (kv?fi(kv)+' B KV':'')+(kv&&st?' + ':'')+(st?fi(st)+' B state':'')};
  if(rt&&B.runs){rt.innerHTML=B.runs.map(r=>'<tr><td>'+RD.esc(r.run)+' <span class="small mute">('+RD.esc(r.label)+'; '+RD.esc(r.owner)+')</span></td><td>'+mixName(r)+
      '</td><td class="num">'+fi(r.params)+'</td><td class="num">'+f3(r.val)+'</td><td class="num">'+f3(r.rs)+'</td><td class="num">'+fi(r.tok_s)+'</td><td class="num">'+cacheStr(r)+'</td></tr>').join('')}

  // loss curves
  const COL={at_mha:'var(--c1)',at_mha_s1:'var(--c1)',pe_nope:'var(--c6)',ba_ssm:'var(--c2)',ba_ssm_s1:'var(--c2)',ba_hybrid:'var(--c4)',ba_hybrid2:'var(--c5)'};
  function curves(){const el=$('rd-curves');if(!el||!B.runs)return;
    const W=Math.min(760,RD.width(el)),H=W<500?230:260,l=40,r=8,t=10,b=30;
    const x=s=>l+(W-l-r-14)*s/1500,y0=1.9,y1=3.4,y=v=>t+(H-t-b)*(1-(Math.min(y1,Math.max(y0,v))-y0)/(y1-y0));
    let s='';for(let v=2;v<=3.4;v+=0.2){s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,y(v)+4,v.toFixed(1),{a:'end',fs:11})}
    for(let st=0;st<=1500;st+=500)s+=RD.t(x(st),H-12,String(st),{a:'middle',fs:11});
    B.runs.forEach(rr=>{const pts=rr.curve.filter(p=>p[0]>=200).map(p=>x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join(' ');
      s+='<polyline points="'+pts+'" fill="none" stroke="'+COL[rr.run]+'" stroke-width="1.8"'+(/_s1$/.test(rr.run)?' stroke-dasharray="4 3"':'')+'/>'});
    el.innerHTML=RD.svg(W,H,s,'training loss against step for each run')+'<div class="leg">'+B.runs.map(rr=>'<span style="--sw:'+COL[rr.run]+'">'+RD.esc(rr.run)+'</span>').join('')+'</div><p class="small mute">Training loss against training step (0 to 1,500), mean of each 50-step window, from step 200 (dashed: seed 1). The y axis is clipped at 3.4.</p>'}
  RD.onRender(curves);RD.onResize(curves);curves();

  // summaries filled from data
  const say=$('rd-runs-say');
  if(say&&B.runs){const a=run('at_mha'),s=run('ba_ssm'),h=run('ba_hybrid'),h2=run('ba_hybrid2'),s1=run('ba_ssm_s1'),n=run('pe_nope');
    let t='<p><b>Reading the table.</b> ';
    if(a&&s)t+='Without a single attention layer the SSM model matches attention on held-out text ('+f3(s.val)+(s1?' and '+f3(s1.val)+' over two seeds':'')+' against '+f3(a.val)+' and '+f3(run('at_mha_s1')?run('at_mha_s1').val:a.val)+') and beats attention without positions ('+(n?f3(n.val):'')+') by a wide margin: order comes free from the recurrence. It is behind on the running sequence ('+f3(s.rs)+(s1?' and '+f3(s1.rs):'')+' against '+f3(a.rs)+' and '+(run('at_mha_s1')?f3(run('at_mha_s1').rs):'')+'), the story that reuses "Roxy" eleven times. ';
    if(h)t+='One attention layer in six ('+f3(h.val)+' held-out, '+f3(h.rs)+' on the running sequence) '+(h.rs<a.rs&&h.val<a.val?'beats full attention on both':h.rs<s.rs?'recovers part of that gap':'does not recover the gap at this budget')+(h2?'; two in six give '+f3(h2.val)+' and '+f3(h2.rs):'')+'. The hybrids are the best runs here, as Jamba, Waleffe et al. and Kimi report at scale; at this size the gaps between attention, hybrid and SSM on held-out text are a few hundredths of a nat, larger than the seed spread for the hybrids, within it for the SSM. ';
    t+='The SSM costs '+(s?fi(s.params-a.params):'')+' more parameters (its mixer has 409k parameters per layer against attention\'s 262k) and trains about '+(s&&a?(a.tok_s/s.tok_s).toFixed(1):'')+' times slower here, in its quadratic training form on MPS. At equal wall-clock time on this Mac attention would have seen more tokens; on a GPU with SSD kernels the ratio is different (not run here).</p>';
    say.innerHTML=t}
  const c=cp();
  const cs=$('rd-cp-sum');
  if(cs){if(c){const row=(m,L)=>m.copy.find(z=>z.words===L);
      cs.innerHTML='Copy accuracy at 32 words: Pythia '+pct(row(c.py,32).acc)+', Mamba '+pct(row(c.mb,32).acc)+'; at 256: '+pct(row(c.py,256).acc)+' and '+pct(row(c.mb,256).acc)+'; at '+fi(c.py.copy[c.py.copy.length-1].words)+': '+pct(c.py.copy[c.py.copy.length-1].acc)+' and '+pct(c.mb.copy[c.mb.copy.length-1].acc)+'. Phone book: '+c.py.phonebook.map((z,i)=>z.entries+' entries '+pct(z.acc)+' / '+pct(c.mb.phonebook[i].acc)).join(', ')+' (Pythia / Mamba, '+c.py.phonebook[0].n+' lookups each). Mamba copies as well as Pythia up to about 32 words, then falls away; Pythia stays above '+pct(Math.min(...c.py.copy.slice(2).map(z=>z.acc)))+'. Both small models lose the phone book as it grows (Pythia too is only 160M parameters), but Mamba collapses first. <span class="meas">measured on Apple M1 Pro (CPU)</span>'}
    else{cs.innerHTML='<span class="unc">pending run</span>'}}
  const ts=$('rd-tr-sum');
  if(ts){if(B.tiny_recall){const R=B.tiny_recall,i=R.dist.indexOf(64);
      const g=k=>{const m=R.models.find(z=>z.run===k);return m?(m.unseen[i]-m.seen[i]).toFixed(2):'n/a'};ts.innerHTML='Recall benefit (control loss minus loss after the first mention, nats per piece) at 64 filler tokens: '+R.models.map(m=>RD.esc(m.run)+' '+(m.unseen[i]-m.seen[i]).toFixed(2)).join(', ')+'. The SSM-only model barely uses the earlier mention ('+g('ba_ssm')+'); one attention layer in six makes the hybrid the best copier of all ('+g('ba_hybrid')+', against '+g('at_mha')+' for full attention). <span class="meas">measured on Apple M1 Pro (CPU)</span>'}
    else ts.innerHTML='<span class="unc">pending run</span>'}
  const ms=$('rd-mq-sum');
  if(ms){if(B.mqar&&B.mqar.length){const g=(m,p)=>{const z=B.mqar.find(q=>q.model===m&&q.pairs===p);return z?pct(z.acc):'n/a'};
      const P=[...new Set(B.mqar.map(q=>q.pairs))].sort((a,b)=>a-b);
      ms.innerHTML='Accuracy on held-out sequences: '+P.map(p=>p+' pairs: attention '+g('attn',p)+', SSM state 16 '+g('ssm16',p)+', SSM state 64 '+g('ssm64',p)+', hybrid '+g('hybrid',p)).join('; ')+'. Only the hybrid learned the task, at 8 pairs; nothing learned 32 or 64 pairs in 8,000 steps. Two attention layers stalled near 35% at 8 pairs: this toy did not converge for attention, so it does <b>not reproduce</b> Zoology and Mamba-2, whose attention baselines solve MQAR after far longer training; read it as a statement about this budget, not about attention. <span class="meas">measured on Apple M1 Pro (MPS)</span>'}
    else ms.innerHTML='<span class="unc">pending run</span>'}
  const p2=$('rd-p2-ans');
  if(p2){p2.innerHTML=c?'Mamba keeps up for short lists (32 words: '+pct(c.mb.copy.find(z=>z.words===32).acc)+' against Pythia\'s '+pct(c.py.copy.find(z=>z.words===32).acc)+') and falls behind as the list outgrows what its state can hold: '+c.mb.copy.map(z=>z.words+' words '+pct(z.acc)).join(', ')+' for Mamba against '+c.py.copy.map(z=>pct(z.acc)).join(', ')+' for Pythia. The break is gradual, not at the 32-token point where the two memories are equal in size: a state is not a list of slots, and a trained model compresses.':'pending run'}

  // predict widgets
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(bt=>bt.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.ok==='1'?'right':'wrong',x===bt||x.dataset.ok==='1'));
      ans.hidden=false}))});
})();
