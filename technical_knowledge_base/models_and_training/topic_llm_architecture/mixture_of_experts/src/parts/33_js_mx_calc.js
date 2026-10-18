// ---- Dense vs MoE calculator: parameters (window.CC, the root's Config calculator core, unchanged), weight memory,
// weight bytes read per decode step against batch, all-to-all bytes per token, and the fine-grained split. ----
(function(){
  const M=window.MX;if(!M||!window.CC||!M.$('cl-model'))return;const {D,$,f,pct,tx,svg,esc}=M;const CC=window.CC;
  const BS=[1,2,4,8,16,32,64,128,256,512,1024],WS=[1,2,4,8,16,32,64],MS=[1,2,4,8,16];
  const models=D.cc.filter(m=>{try{CC.normalise(m.cfg);return true}catch(e){return false}});
  $('cl-model').innerHTML=models.map(m=>'<option value="'+m.key+'"'+(m.key==='deepseek-v3'?' selected':'')+'>'+esc(m.label)+'</option>').join('');
  const st={key:'deepseek-v3',dt:2,b:5,w:3,m:0};
  const G=n=>n>=1e12?f(n/1e12,2)+'T':n>=1e9?f(n/1e9,2)+'B':n>=1e6?f(n/1e6,1)+'M':f(n,0);
  const GB=b=>b>=1e12?f(b/1e12,2)+' TB':b>=1e9?f(b/1e9,1)+' GB':f(b/1e6,1)+' MB';
  function model(){const m=models.find(x=>x.key===st.key),spec=CC.normalise(m.cfg),p=CC.params(spec),d=spec.d;
    const moeL=spec.layers.filter(l=>l.ffn&&l.ffn.t==='moe');const f0=moeL.length?moeL[0].ffn:null;
    let per=0,E=0,k=0,ff=0;if(f0){const fp=CC.ffnParams(f0,d);E=f0.E;k=f0.k;ff=f0.ff;per=(fp.routed+fp.routed_o)/E}
    return {m,spec,p,d,L:moeL.length,E,k,ff,per,routed:p.breakdown.moe_routed,emb:p.breakdown.embedding}}
  function draw(){const x=model(),b=x.p.breakdown,tot=x.p.total,dt=st.dt;
    const parts=[['embedding',b.embedding,'var(--c5)'],['output head',b.unembedding,'var(--c6)'],['attention',b.attention+b.ssm,'var(--c1)'],['dense FFN',b.ffn_dense,'var(--c4)'],['shared experts',b.moe_shared,'var(--good)'],['routed experts',b.moe_routed,'var(--c2)'],['router, norms, other',b.router+b.norms+b.biases_other,'var(--mute)']].filter(p=>p[1]>0);
    const el=$('cl-bar'),W=M.width(el),H=70;let s='',xx=0;
    const actR=x.L?x.per*x.k*x.L:0,act=x.p.active;
    parts.forEach(p=>{const w=(W-2)*p[1]/tot;s+='<rect x="'+(1+xx).toFixed(1)+'" y="4" width="'+Math.max(0.5,w).toFixed(1)+'" height="24" fill="'+p[2]+'"><title>'+p[0]+' '+G(p[1])+'</title></rect>';xx+=w});
    xx=0;parts.forEach(p=>{const v=p[0]==='routed experts'?actR:p[1];const w=(W-2)*v/tot;s+='<rect x="'+(1+xx).toFixed(1)+'" y="40" width="'+Math.max(0.5,w).toFixed(1)+'" height="24" fill="'+p[2]+'"><title>'+p[0]+' '+G(v)+' per token</title></rect>';xx+=w});
    s+=tx(W-4,20,'stored',{a:'end',fs:11,w:600,fill:'var(--ink)'})+tx(Math.min(W-4,xx+60),56,'used per token',{a:xx+60>W-4?'end':'start',fs:11,w:600,fill:'var(--ink)'});
    el.innerHTML=svg(W,H,s,'Stored and active parameters')+'<div class="leg">'+parts.map(p=>'<span style="--sw:'+p[2]+'">'+p[0]+' '+G(p[1])+'</span>').join('')+'</div>';
    const pub=x.m.pub||{};
    $('cl-out').innerHTML=RD.stat('Total',G(tot),'published: '+esc(pub.label||'&minus;'))+RD.stat('Active per token',G(act),'without input embedding '+G(x.p.active_no_emb))+
      RD.stat('Sparsity (total / active)',f(tot/act,1)+'&times;',x.L?x.L+' MoE layers, '+x.k+' of '+x.E+' experts':'dense model')+RD.stat('Weights at this precision',GB(tot*dt),'every expert must be resident');
    $('cl-note').innerHTML=esc(pub.note||'')+(x.m.cfg.text_config?' (text model only; vision weights excluded)':'');
    read(x);ep(x);gran(x)}
  function touched(E,k,B){return E?E*(1-Math.pow(1-k/E,B)):0}
  function read(x){const dt=st.dt,B=BS[st.b];$('cl-bv').textContent=B;
    const rest=x.p.total-x.routed-x.emb;                     // everything read every step (head included, input embedding excluded)
    const step=Bv=>(rest+x.L*touched(x.E,x.k,Bv)*x.per)*dt;
    const actNE=x.p.active_no_emb,totNE=x.p.total-x.emb;
    const se=[{name:'this model',color:'var(--c2)',dots:true,pts:BS.map((Bv,i)=>[i,step(Bv)/1e9])},
      {name:'dense model of the same active size',color:'var(--c1)',dash:true,pts:BS.map((Bv,i)=>[i,actNE*dt/1e9])},
      {name:'dense model of the same total size',color:'var(--mute)',dash:true,pts:BS.map((Bv,i)=>[i,totNE*dt/1e9])}];
    M.lines($('cl-read'),se,{x0:0,x1:10,xt:[0,2,4,6,8,10],xf:i=>BS[i],xl:'running sequences B (log scale)',y0:0,yd:0,label:'GB of weights read per decode step'});
    const tch=touched(x.E,x.k,B);
    $('cl-rout').innerHTML=x.L?RD.stat('Experts touched per MoE layer',f(tch,1)+' of '+x.E,pct(tch/x.E,0)+' of the layer\'s experts')+RD.stat('Tokens per touched expert',f(B*x.k/tch,1),'B &middot; k / touched: the rows of each expert matmul')+
      RD.stat('Weights read per step',GB(step(B)),'against '+GB(actNE*dt)+' for a dense model of the active size')+RD.stat('FLOPs per weight byte read',f(2*B*actNE/step(B),1),'2 &middot; B &middot; active / bytes: higher is less bandwidth-bound'):'<p class="small mute">Dense model: every step reads all its weights whatever the batch.</p>'}
  function ep(x){const W=WS[st.w];$('cl-wv').textContent=W;if(!x.L){$('cl-ep').innerHTML='<p class="small mute">Dense model: no expert parallelism.</p>';return}
    const tok=x.k*x.d*2;   // BF16 activations
    $('cl-ep').innerHTML=RD.stat('Experts per rank per layer',W<=x.E?f(x.E/W,W>x.E?2:0):'&lt; 1','E / W')+RD.stat('Sent per token per MoE layer',f(tok/1024,1)+' KiB','k &middot; d &middot; 2 bytes (BF16), each way')+
      RD.stat('Of which leaves the rank',pct(1-1/W,0),'uniform routing: 1/W of copies stay local')+RD.stat('Per token, all MoE layers, forward',f(2*x.L*tok*(1-1/W)/1048576,2)+' MiB','dispatch + combine; the backward repeats it')}
  function gran(x){const m=MS[st.m];$('cl-mv').textContent=m;if(!x.L){$('cl-gran').innerHTML='';$('cl-gran-note').innerHTML='Dense model: pick an MoE model.';return}
    const E2=x.E*m,k2=x.k*m,ff2=x.ff/m,d=x.d;
    const lc=(n,r)=>{let s=0;for(let i=0;i<r;i++)s+=Math.log10(n-i)-Math.log10(i+1);return s};
    const row=(lab,a,b)=>'<tr><td>'+lab+'</td><td class="num">'+a+'</td><td class="num">'+b+'</td></tr>';
    const routerP=(Ee)=>x.L*d*Ee;
    $('cl-gran').innerHTML='<table><thead><tr><th></th><th class="num">as released</th><th class="num">split '+m+' ways</th></tr></thead><tbody>'+
      row('routed experts E',f(x.E,0),f(E2,0))+row('per token k',f(x.k,0),f(k2,0))+row('expert width',f(x.ff,0),f(ff2,1))+
      row('total parameters',G(x.p.total),G(x.p.total+routerP(E2)-routerP(x.E)))+row('active parameters',G(x.p.active),G(x.p.active+routerP(E2)-routerP(x.E)))+
      row('log10 C(E, k): possible expert sets',f(lc(x.E,x.k),1),f(lc(E2,k2),1))+row('expert matmul shape per token row','1 &times; '+f(d,0)+' &rarr; '+f(x.ff,0),'1 &times; '+f(d,0)+' &rarr; '+f(ff2,1))+
      row('all-to-all per token per layer (BF16, if d is sent per expert)',f(x.k*d*2/1024,1)+' KiB',f(k2*d*2/1024,1)+' KiB')+'</tbody></table>';
    $('cl-gran-note').innerHTML=m===1?'Move the slider: DeepSeekMoE\'s move was m = 2 to 4 at fixed compute; DeepSeek-V3 is already 256 experts of width 2,048 against a dense 18,432.':
      'Same compute, '+f(lc(E2,k2)-lc(x.E,x.k),1)+' more orders of magnitude of expert combinations, but '+m+'&times; the dispatch volume unless tokens are sent once per node and fanned out there (DeepSeek-V3) or projected to a smaller latent first (section 5 of the Reading tab), and '+m+'&times; skinnier matrix multiplies.'}
  $('cl-model').addEventListener('change',e=>{st.key=e.target.value;draw()});$('cl-dt').addEventListener('change',e=>{st.dt=+e.target.value;draw()});
  $('cl-b').addEventListener('input',e=>{st.b=+e.target.value;read(model())});$('cl-w').addEventListener('input',e=>{st.w=+e.target.value;ep(model())});
  $('cl-m').addEventListener('input',e=>{st.m=+e.target.value;gran(model())});
  M.onTab('t-calc',draw);
})();
