// Inside a real model: attention-map explorer (SmolLM2-135M on the running text).
(function(){
  const I=window.IN;if(!I||!I.D.smol||!I.$('in-ex'))return;
  const S=I.D.smol,$=I.$,f=I.fmt,L=S.L,H=S.H,T=S.T,M=S.maps;
  // decode the sparse maps: per stored layer, head, query -> list of [key, weight]
  const raw=I.b64(M.data);const rows={};let p=0;
  M.layers.forEach(l=>{for(let h=0;h<H;h++){const hs=[];for(let q=0;q<T;q++){const n=raw[p++];const r=[];for(let k=0;k<n;k++){r.push([raw[p],raw[p+1]/255]);p+=2}hs.push(r)}rows[l+'_'+h]=hs}});
  const st={sc:'prev',l:I.D.facts?+(/layer (\d+)/.exec(I.D.facts.smol_prev_best_lbl)||[0,16])[1]:16,h:0,q:null};
  st.h=I.D.facts?+(/head (\d+)/.exec(I.D.facts.smol_prev_best_lbl)||[0,0])[1]:0;
  const scoreOf=(sc,l,h)=>sc==='ind'?S.ind[l][h]:S.scores[sc][l][h];
  const scLab={prev:'Previous-token score: mean weight a query puts on the token just before it.',ind:'Induction score, measured on the repeated random sequence: mean weight on the token after the earlier copy of the current token.',sink:'First-token score: mean weight on token 0, queries from position 8.',ent:'Spread: entropy of the row divided by its maximum (log of the number of visible keys); 1 = uniform.'};
  // the default query: the last "x" of Roxy, or the last token
  const toks=S.tokens;let dq=T-1;for(let i=T-1;i>0;i--){if(/Rox|^x$/.test(toks[i])){dq=i;break}}st.q=dq;
  const col=v=>'color-mix(in srgb, var(--c1) '+Math.round(Math.max(0,Math.min(1,v))*100)+'%, var(--soft))';
  function atlas(){const el=$('in-atlas');const cw=Math.max(10,Math.min(34,Math.floor((I.width(el)-34)/H)-2));
    el.style.gridTemplateColumns='30px repeat('+H+','+cw+'px)';
    let h='<span class="lab"></span>';for(let j=0;j<H;j++)h+='<span class="lab" style="text-align:center">'+j+'</span>';
    for(let l=0;l<L;l++){h+='<span class="lab">'+l+(M.layers.includes(l)?'':'')+'</span>';for(let j=0;j<H;j++){const v=scoreOf(st.sc,l,j);
      h+='<button data-l="'+l+'" data-h="'+j+'" title="layer '+l+', head '+j+': '+f(v,2)+'" aria-label="layer '+l+' head '+j+' score '+f(v,2)+'" style="background:'+col(v)+(M.layers.includes(l)?'':';border-color:var(--line);border-style:dashed')+'"'+(l===st.l&&j===st.h?' class="sel"':'')+'></button>'}}
    el.innerHTML=h;$('in-exsclab').textContent=scLab[st.sc];
    $('in-exleg').innerHTML='<span><i style="background:'+col(0)+'"></i>0</span><span><i style="background:'+col(.5)+'"></i>0.5</span><span><i style="background:'+col(1)+'"></i>1</span><span>dashed cell: scores only, map not stored</span>'}
  function sels(){$('in-exl').innerHTML=Array.from({length:L},(_,l)=>'<option value="'+l+'"'+(l===st.l?' selected':'')+'>'+l+(M.layers.includes(l)?'':' (scores only)')+'</option>').join('');
    $('in-exh').innerHTML=Array.from({length:H},(_,h)=>'<option value="'+h+'"'+(h===st.h?' selected':'')+'>'+h+'</option>').join('')}
  function map(){const cv=$('in-excv'),R=rows[st.l+'_'+st.h];
    const sc=['prev','ind','sink','ent'].map(k=>k+' '+f(scoreOf(k,st.l,st.h),2)).join(', ');
    $('in-exinfo').innerHTML='layer '+st.l+', head '+st.h+' (KV head '+Math.floor(st.h/(H/S.kv))+'): '+sc;
    const w=Math.min(I.width(cv.parentNode),520);const dpr=window.devicePixelRatio||1;
    cv.style.width=w+'px';cv.style.height=(R?w:40)+'px';cv.width=Math.round(w*dpr);cv.height=Math.round((R?w:40)*dpr);
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=I.css('--soft');g.fillRect(0,0,w,R?w:40);
    if(!R){g.fillStyle=I.css('--mute');g.font='12px sans-serif';g.fillText('Map not stored for layer '+st.l+'; stored: '+M.layers.join(', '),8,24);text();return}
    const c=w/T,ink=I.css('--c1');g.fillStyle=I.css('--bg');
    for(let q=0;q<T;q++)g.fillRect(0,q*c,(q+1)*c,c);
    g.fillStyle=ink;for(let q=0;q<T;q++)R[q].forEach(([k,v])=>{g.globalAlpha=Math.min(1,0.15+v*0.85);g.fillRect(k*c,q*c,Math.max(c,2),Math.max(c,2))});
    g.globalAlpha=1;g.strokeStyle=I.css('--bad');g.lineWidth=1.5;g.strokeRect(0,st.q*c,(st.q+1)*c,Math.max(c,2));
    text()}
  function text(){const R=rows[st.l+'_'+st.h];const row=R?R[st.q]:[];const w={};row.forEach(([k,v])=>w[k]=v);
    $('in-extext').innerHTML=toks.map((s,i)=>'<span data-i="'+i+'"'+(i===st.q?' class="q"':'')+(w[i]?' style="background:'+col(Math.min(1,w[i]*1.6))+'"':'')+'>'+I.esc(s.replace(/\n/g,'↵\n'))+'</span>').join('');
    const top=row.slice().sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>'"'+I.esc(I.vis(toks[k]))+'" (pos '+k+') '+f(v,2)).join(', ');
    $('in-extip').innerHTML=R?'Query: <b>"'+I.esc(I.vis(toks[st.q]))+'"</b> at position '+st.q+' reads '+(top||'nothing above '+M.th)+'.':'';}
  $('in-exnote').innerHTML='SmolLM2-135M on the running text ('+T+' tokens with its tokenizer), eager attention, float32, measured on Apple M1 Pro (MPS). Maps stored for layers '+M.layers.join(', ')+' only (all heads), and only weights of at least '+M.th+' (they carry '+f(M.mass_kept*100,0)+'% of the attention mass in those layers), to fit the page; scores in the grid use every weight of every head. Dot = space, ↵ = newline. <span class="in-lbl m">measured here</span>';
  $('in-atlas').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.l=+b.dataset.l;st.h=+b.dataset.h;sels();atlas();map()});
  $('in-exl').addEventListener('change',e=>{st.l=+e.target.value;atlas();map()});
  $('in-exh').addEventListener('change',e=>{st.h=+e.target.value;atlas();map()});
  $('in-extext').addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;st.q=+s.dataset.i;map()});
  $('in-excv').addEventListener('click',e=>{const r=e.target.getBoundingClientRect();const q=Math.floor((e.clientY-r.top)/r.height*T);if(q>=0&&q<T){st.q=q;map()}});
  I.seg($('in-exsc'),m=>{st.sc=m;atlas()});
  function all(){sels();atlas();map()}
  I.onRender(all);all();
})();
