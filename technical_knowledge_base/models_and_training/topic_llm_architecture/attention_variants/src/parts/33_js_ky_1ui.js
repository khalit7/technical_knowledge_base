// Which keys are read: SmolLM2's real attention under each variant's read set; the stacked-window reach; the top-k table.
(function(){
  if(!window.AVK||!document.getElementById('ky-txt'))return;
  const $=id=>document.getElementById(id),K=window.AVK,esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KS=[8,16,32,64,128],WS=[16,32,64,128],BL=16;
  let mode='full',inited=false,anim=null,mod='smollm2';
  const dec=(s,m)=>Array.from(s,ch=>(ch.charCodeAt(0)-48)/63*m);
  function row(){const l=+$('ky-l').value,q=+$('ky-q').value;const r=K.rows.find(x=>x.layer===l&&x.q===q);
    return {r,w:$('ky-h').value==='head'?dec(r.head_row,r.head_max):dec(r.mean,r.mean_max)}}
  function readSet(w,q,k){const n=q+1,set=new Set();
    if(mode==='full'){for(let j=0;j<n;j++)set.add(j)}
    else if(mode==='win'){for(let j=Math.max(0,q-k+1);j<=q;j++)set.add(j)}
    else if(mode==='sink'){set.add(0);for(let j=Math.max(0,q-k+2);j<=q;j++)set.add(j)}
    else if(mode==='dsa'){const ix=[...Array(n).keys()].sort((a,b)=>w[b]-w[a]).slice(0,k);ix.forEach(j=>set.add(j))}
    else if(mode==='nsa'){const nb=Math.ceil(n/BL),qb=Math.floor(q/BL),mass=[];for(let b=0;b<nb;b++){let s=0;for(let j=b*BL;j<Math.min(n,(b+1)*BL);j++)s+=w[j];mass.push(s)}
      const want=Math.max(3,Math.round(k/BL)),pick=new Set([0,qb,Math.max(0,qb-1)]);
      [...mass.keys()].sort((a,b)=>mass[b]-mass[a]).forEach(b=>{if(pick.size<want)pick.add(b)});
      pick.forEach(b=>{for(let j=b*BL;j<Math.min(n,(b+1)*BL);j++)set.add(j)})}
    return set}
  function draw(){
    const k=KS[+$('ky-k').value];$('ky-kv').textContent=mode==='nsa'?k+' tokens ('+Math.max(3,Math.round(k/BL))+' blocks of '+BL+')':k;
    const {r,w}=row(),q=r.q,set=readSet(w,q,k);const tot=w.reduce((a,b)=>a+b,0)||1;let kept=0;set.forEach(j=>kept+=w[j]);
    const mx=Math.max(...w)||1;
    $('ky-txt').innerHTML=K.tokens.map((t,j)=>{if(j>q)return '<span class="ky-t fut">'+esc(t)+'</span>';
      const a=Math.sqrt(w[j]/mx);const cls='ky-t'+(j===q?' q':'')+(set.has(j)?' rd':' off');
      return '<span class="'+cls+'" title="position '+j+', weight '+w[j].toFixed(3)+'" style="background:color-mix(in srgb,var(--c4) '+(a*70).toFixed(0)+'%,transparent)">'+esc(t)+'</span>'}).join('');
    const st=(a,b,c)=>'<div class="stat"><div class="k">'+a+'</div><div class="v">'+b+'</div><div class="d small">'+(c||'')+'</div></div>';
    $('ky-out').innerHTML=st('keys read',set.size+' of '+(q+1),'')+st('real attention kept',(100*kept/tot).toFixed(1)+'%','of this row\'s weight')+
      st('weight on position 0',(100*w[0]/tot).toFixed(1)+'%',$('ky-h').value==='head'?'head '+r.head:'head mean')+st('read fraction',(100*set.size/(q+1)).toFixed(0)+'%','');
    const notes={full:'Full causal attention reads every earlier token: the cache must hold all of them and every decoded token reads all of them.',
      win:'A sliding window reads only the last W tokens, so the cache holds W entries per layer. Whatever weight fell outside the window is lost unless another layer carries it.',
      sink:'StreamingLLM keeps position 0 beside the window. In the deep layers SmolLM2 parks a large share of weight on position 0 (its attention sink); keeping that one entry is what stops a window from breaking the model (the Inside lab on the root measured it: window 64 alone 3.36, window plus the first token 1.81 against 1.62 full).',
      dsa:'DSA keeps every entry in memory and lets attention read only the top k by an indexer\'s score. Here the real weights choose (an oracle), so the kept share is the best any indexer could do at this k.',
      nsa:'NSA reads three things: a compressed summary of every block (not drawn), the top blocks by score, and a local window; the first block and the two local blocks are always among the selected. Blocks of 16 tokens here (NSA uses 64 at long context).'};
    $('ky-note').innerHTML='<div class="t">'+esc($('ky-var').querySelector('button.on').textContent)+'</div><p>'+notes[mode]+'</p>';
  }
  function reach(s,W,inter){for(let l=1;l<=s;l++)if(inter&&l%3===0)return Infinity;return s*(W-1)}
  function strip(i){
    const W=WS[+$('ky-w').value];$('ky-wv').textContent=W;const s=i+1,q=K.tokens.length-1;const n=q+1;const cells=64;
    const bar=(R)=>{let h='';for(let c=0;c<cells;c++){const p=Math.floor(c*n/cells);const ok=q-p<=R;h+='<i style="background:'+(ok?'var(--acc)':'transparent')+'"></i>'}return '<div class="c">'+h+'</div>'};
    let h='<div class="small"><b>Every layer local</b></div>';for(let l=1;l<=s;l++)h+='<div class="r"><span>layer '+l+'</span>'+bar(reach(l,W,false))+'</div>';
    h+='<div class="small" style="margin-top:4px"><b>2 local : 1 global</b> (layers 3 and 6 global)</div>';for(let l=1;l<=s;l++)h+='<div class="r"><span>layer '+l+(l%3===0?' G':'')+'</span>'+bar(reach(l,W,true))+'</div>';
    $('ky-strip').innerHTML=h;
    const Ra=reach(s,W,false),Rb=reach(s,W,true);
    $('ky-cap').innerHTML='<b>After layer '+s+'.</b> All-local: the last token can be influenced by the previous '+Math.min(q,Ra)+' tokens ('+s+' x (W - 1) = '+Ra+(Ra>=q?', the whole 226-token text':'')+'). Interleaved: '+(Rb===Infinity?'every token, since a global layer has run':Rb+' tokens')+'. '+(s===6?'With 6 layers and W = '+W+', the all-local stack reaches '+(6*(W-1))+' tokens: Mistral 7B\'s 32 layers x 4,096 give the "about 131K" its paper calls a theoretical span; theoretical, because information must survive 32 hops of mixing to get there.':'');
  }
  function table(){
    const S=K.stats[mod];const ks=Object.keys(S.layers[0].topk);
    let h='<thead><tr><th>Layer</th>'+ks.map(k=>'<th class="num">top '+k+'</th>').join('')+'<th class="num">top 16 without position 0</th><th class="num">top 4 blocks of '+S.block+'</th><th class="num">position 0</th><th class="num">last 64</th><th class="num">last 64 + position 0</th></tr></thead><tbody>';
    for(const r of S.layers)h+='<tr><td>'+r.layer+'</td>'+ks.map(k=>'<td class="num">'+(100*r.topk[k]).toFixed(0)+'%</td>').join('')+'<td class="num">'+(100*r.topk_no_tok0['16']).toFixed(0)+'%</td><td class="num">'+(100*r.top_blocks['4']).toFixed(0)+'%</td><td class="num">'+(100*r.tok0).toFixed(1)+'%</td><td class="num">'+(100*r.window64).toFixed(0)+'%</td><td class="num">'+(100*r.window64_plus_tok0).toFixed(0)+'%</td></tr>';
    $('ky-tab').innerHTML=h+'</tbody>';
    $('ky-say').innerHTML=K.say[mod];
  }
  function init(){if(inited)return;inited=true;
    $('ky-q').innerHTML=K.queries.map(q=>'<option value="'+q+'">'+q+': "'+esc(K.tokens[q].trim()||K.tokens[q])+'"</option>').join('');$('ky-q').value=K.queries[K.queries.length-1];
    $('ky-l').innerHTML=K.layers.map(l=>'<option value="'+l+'">'+l+' of 30</option>').join('');$('ky-l').value=18;
    ['ky-q','ky-l','ky-h','ky-k'].forEach(id=>$(id).addEventListener(id==='ky-k'?'input':'change',draw));
    $('ky-var').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('ky-var').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
    $('ky-mod').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mod=b.dataset.m;$('ky-mod').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));table()});
    anim=RD.anim({card:'ky-strip',ctl:'ky-ctl',n:6,ms:1300,draw:strip,label:'Layer'});
    $('ky-w').addEventListener('input',()=>anim.redraw());
    draw();table();
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-keys']=window.TAB_RENDER['t-keys']||[]).push(()=>{init();draw()});
})();
