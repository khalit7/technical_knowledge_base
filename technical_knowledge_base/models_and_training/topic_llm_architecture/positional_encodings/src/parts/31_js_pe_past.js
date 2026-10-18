// ---- Tab: Past the trained length. The running sequence at growing offsets, plain RoPE (before) against a chosen method (after), all measured ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pe-pa')||!window.PE_DATA||!window.PE)return;
  const {D,fmt,f2,css,esc,pend}=window.PE,RD=window.RD,RO=window.ROPE;
  const PA=D.past||{},OFF=PA.offsets||[0,768],runs=PA.runs||[];
  const tiny=D.presets.tiny,seen=RO.seenArc(tiny),plainInv=RO.baseInv(tiny.base,tiny.dim);
  // the "after" choices: [label, model, scaling key, rope scaling for the dials (null = not RoPE)]
  const CH=[['PI ×4','at_mha','linear x4',{m:'pi',s:4}],['PI ×8','at_mha','linear x8',{m:'pi',s:8}],['NTK ×8','at_mha','ntk x8',{m:'ntk',s:8}],
    ['YaRN ×4','at_mha','yarn x4',{m:'yarn',s:4}],['YaRN ×8','at_mha','yarn x8',{m:'yarn',s:8}],['YaRN ×8 without temperature','at_mha','yarn x8, no temperature',{m:'yarn',s:8}],
    ['PI ×4 + 300 steps at 1,024','lc_pi_ft','linear x4 + 300 steps at 1,024',{m:'pi',s:4}],
    ['ALiBi','pe_alibi','plain',null],['NoPE','pe_nope','plain',null],['Sinusoidal, embeddings × 16','pe_sinusoidal_x16','plain',null],['Sinusoidal, as trained','pe_sinusoidal','plain',null],['Learned','ref_baseline_s1500','plain',null]];
  const get=(m,s)=>runs.find(r=>r.model===m&&r.scaling===s);
  const avail=CH.filter(c=>get(c[1],c[2]));
  const S={c:avail.findIndex(c=>c[0]==='YaRN ×8')};if(S.c<0)S.c=0;
  const base=get('at_mha','plain');
  // loss colour: 0 to 6 nats on a light-to-red ramp, readable in both themes
  const lc=v=>{const t=Math.max(0,Math.min(1,(v-1)/4));return 'hsl('+(50-50*t).toFixed(0)+','+(55+35*t).toFixed(0)+'%,'+(78-38*t).toFixed(0)+'%)'};
  function dials(inv,dist,W){if(!inv)return '';const n=16,cols=W<520?8:16,cw=W/cols,r=Math.max(9,Math.min(15,cw/2-4)),rowsH=2*r+20,rows=Math.ceil(n/cols),H=rows*rowsH+4;
    let g='';let un=0;
    for(let i=0;i<n;i++){const cx=(i%cols+.5)*cw,cy=Math.floor(i/cols)*rowsH+r+3,a=seen[i],full=a>=2*Math.PI-1e-9,ang=(dist*inv[i])%(2*Math.PI),bad=!full&&ang>a*(1+1e-9);if(bad)un++;
      g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)"/>';
      if(full)g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-2)+'" fill="'+css('--c1')+'" opacity=".18"/>';
      else{const x2=cx+(r-2)*Math.cos(a),y2=cy-(r-2)*Math.sin(a);g+='<path d="M'+cx+' '+cy+'L'+(cx+r-2)+' '+cy+'A'+(r-2)+' '+(r-2)+' 0 '+(a>Math.PI?1:0)+' 0 '+x2.toFixed(2)+' '+y2.toFixed(2)+'Z" fill="'+css('--good')+'" opacity=".25"/>'}
      g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+r*Math.cos(ang)).toFixed(2)+'" y2="'+(cy-r*Math.sin(ang)).toFixed(2)+'" stroke="'+(bad?css('--bad'):full?css('--c1'):css('--good'))+'" stroke-width="2" stroke-linecap="round"/>';
      g+=RD.t(cx,cy+r+13,String(i),{fs:11,a:'middle',fill:'var(--mute)'})}
    return {svg:RD.svg(W,H,g,'The tiny GPT\'s 16 RoPE pairs at distance '+fmt(dist)),un}}
  function strip(sh,W){if(!sh||sh.error)return '<div class="pe-pa-txt">'+esc(sh?sh.error:'not measured')+'</div>';
    const n=sh.bins8.length,cw=W/n,H=26;let g='';sh.bins8.forEach((v,i)=>{g+='<rect x="'+(i*cw+.5).toFixed(1)+'" y="2" width="'+Math.max(1,cw-1).toFixed(1)+'" height="20" fill="'+lc(v)+'"><title>tokens '+(8*i)+' to '+(8*i+7)+': loss '+f2(v,2)+'</title></rect>'});
    return RD.svg(W,H,g,'Loss on the running sequence, 32 cells of 8 tokens')}
  function panel(el,run,ch,off,W){const sh=run&&run.shifted?run.shifted[String(off)]:null;const dist=off+255;
    let inv=null;if(ch===null)inv=plainInv;else if(ch&&ch[3])inv=RO.method(tiny,ch[3].m,ch[3].s);
    const d=inv?dials(inv,dist,W):null;
    el.innerHTML='<div class="pe-pa-row"><div class="pe-pa-k">Loss on Roxy\'s 256 tokens'+(sh&&sh.mean!=null?': mean <b>'+f2(sh.mean,2)+'</b>':'')+'</div>'+strip(sh,W)+
      (d?'<div class="pe-pa-k">RoPE pairs at distance '+fmt(dist)+' (0 fastest)</div>'+d.svg:'<div class="pe-pa-k">'+(ch[1]==='pe_alibi'?'No rotation: each head subtracts slope × distance (slopes 1/2 to 1/256), nothing goes out of range.':ch[1]==='pe_nope'?'No positions at all: only the causal mask orders the tokens.':ch[1].startsWith('pe_sinusoidal')?'Sinusoids added to the input: positions past 255 are vectors the model never saw.':'A learned table of 256 rows: no row exists past 255.')+'</div>')+
      '<div class="pe-pa-k">Greedy continuation of Roxy\'s first 200 tokens</div><div class="pe-pa-txt">'+(sh&&sh.greedy!=null?esc(sh.greedy.trim()):'<span class="p">'+esc(sh&&sh.error?sh.error:'no output')+'</span>')+'</div></div>';
    return {mean:sh&&sh.mean!=null?sh.mean:null,un:d?d.un:null,err:sh&&sh.error}}
  let anim;
  function draw(i){const off=OFF[i],W=RD.width($('pe-paA')),ch=avail[S.c],run=get(ch[1],ch[2]);
    const A=panel($('pe-paA'),base,null,off,W),B=panel($('pe-paB'),run,ch,off,W);
    $('pe-paBt').textContent=ch[0];
    $('pe-paStep').textContent='Roxy at positions '+fmt(off)+' to '+fmt(off+255)+(off===0?' (the trained window)':off<256?' (partly past 256)':' ('+f2((off+256)/256,1)+' × the trained length at the end)');
    let t;
    if(off===0)t='Inside the trained length every RoPE pair is in range. Plain RoPE scores '+f2(A.mean,2)+'. '+(B.err?ch[0]+' cannot fail here yet.':ch[0]+' scores '+f2(B.mean,2)+(B.mean>A.mean+0.02?': the scaling already costs '+f2(B.mean-A.mean,2)+' on text the model handles fine, the price of static scaling.':'.'));
    else{t='The window now spans '+fmt(off+256)+' tokens. Plain RoPE: '+A.un+' of 16 pairs at angles never seen in training, mean loss '+f2(A.mean,2)+' (from '+(base.shifted['0']?f2(base.shifted['0'].mean,2):'?')+' at offset 0). ';
      if(B.err)t+=ch[0]+' cannot read it at all: '+B.err+'.';
      else t+=ch[0]+': '+(B.un!=null?B.un+' pairs out of range, ':'')+'mean loss '+f2(B.mean,2)+'.'+(B.mean<A.mean-0.3?' Same text, same weights, only the positions treated differently.':'')}
    $('pe-paCap').textContent=t;
    $('pe-paCnt').innerHTML=RD.stat('Plain RoPE',A.mean!=null?f2(A.mean,2):'','mean loss on the 256 tokens')+RD.stat(ch[0],B.mean!=null?f2(B.mean,2):'error','mean loss on the same tokens')+RD.stat('Pairs out of range',(A.un!=null?A.un:'')+' → '+(B.un!=null?B.un:'n/a'),'plain → after, of 16')+RD.stat('Window','0 to '+fmt(off+255),'trained on 0 to 255')}
  function start(){$('pe-paM').innerHTML=avail.map((c,i)=>'<button data-i="'+i+'" class="'+(i===S.c?'on':'')+'" aria-pressed="'+(i===S.c)+'">'+esc(c[0])+'</button>').join('');
    if(!anim)anim=RD.anim({card:'pe-pa',ctl:'pe-paC',n:OFF.length,draw,ms:2600,label:'Offset step'});else anim.redraw()}
  $('pe-paM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.c=+b.dataset.i;[...$('pe-paM').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});anim.redraw()});
  $('pe-paNote').innerHTML='Offsets '+OFF.map(fmt).join(', ')+'; the text in front of Roxy is the validation stories that follow it (from token '+fmt(PA.filler_from_val_token||0)+' of val.bin). Loss per cell is the mean of 8 next-token losses (the last cell repeats the final token, 255 targets in all). Dials: each pair judged on its angle modulo one turn at the largest distance in the window, as on the Reading tab. Greedy decoding, 40 new tokens, KV cache on.';
  // per-position curves over 2,048 tokens
  const CV=[['at_mha','plain','RoPE, no scaling','--c1',''],['at_mha','linear x8','RoPE + PI ×8','--c1','2 2'],['at_mha','ntk x8','RoPE + NTK ×8','--c6','4 2'],['at_mha','yarn x8','RoPE + YaRN ×8','--c5',''],
    ['pe_alibi','plain','ALiBi','--c3',''],['pe_nope','plain','NoPE','--mute',''],['pe_sinusoidal_x16','plain','Sinusoidal (embeddings × 16)','--c2',''],['ref_baseline_s1500','plain','Learned (to 255 only)','--c4',''],
    ['lc_pi_ft','linear x4 + 300 steps at 1,024','RoPE + PI ×4, fine-tuned 300 steps at 1,024','--ink','6 3'],['lc_plain_ft','plain + 300 steps at 1,024','RoPE, fine-tuned 300 steps at 1,024','--c4','2 3']];
  const on={};CV.forEach((c,i)=>on[i]=i!==1&&i!==2&&i!==9?1:0);
  function drawPc(){const el=$('pe-pcSvg');if(!el)return;const W=RD.width(el),H=W<520?260:300,ml=44,mr=12,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb,ymin=1.8,ymax=6.2,L=PA.length||2048,bin=PA.bin||64;
    const X=p=>ml+p/L*pw,Y=v=>mt+(1-(Math.min(ymax,Math.max(ymin,v))-ymin)/(ymax-ymin))*ph;let g='';
    for(let v=2;v<=6;v+=1)g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-5,Y(v)+4,f2(v,1),{a:'end',fill:'var(--mute)'});
    [0,512,1024,1536,2048].forEach(p=>{g+=RD.t(X(p),H-mb+15,fmt(p),{a:p===0?'start':p===2048?'end':'middle',fill:'var(--mute)'})});
    g+='<line x1="'+X(256)+'" x2="'+X(256)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(X(256)+4,mt+12,'trained 256',{fill:'var(--bad)'});
    g+=RD.t(ml+pw/2,H-4,'position in the window',{a:'middle',fill:'var(--mute)'});
    CV.forEach((c,i)=>{const r=get(c[0],c[1]);if(!r||!on[i])return;let d='';r.curve.forEach((v,j)=>{d+=(j?'L':'M')+X(j*bin+bin/2).toFixed(1)+' '+Y(v).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="'+css(c[3])+'" stroke-width="2"'+(c[4]?' stroke-dasharray="'+c[4]+'"':'')+'/>'});
    el.innerHTML=RD.svg(W,H,g,'Held-out loss against position');
    $('pe-pcLeg').innerHTML=CV.map((c,i)=>get(c[0],c[1])?'<label class="pe-chk"><input type="checkbox" data-i="'+i+'"'+(on[i]?' checked':'')+'> <i style="background:'+css(c[3])+'"></i>'+c[2]+'</label>':'').join('');
    const tb=$('pe-pcT').querySelector('tbody'),NM={ref_baseline_s1500:'Learned',pe_learned_s1:'Learned (seed 1)',pe_sinusoidal:'Sinusoidal (as trained, swamped)',pe_sinusoidal_x16:'Sinusoidal, embeddings × 16',pe_alibi:'ALiBi',pe_nope:'NoPE',at_mha:'RoPE',pe_rope_s1:'RoPE (seed 1)',lc_pi_ft:'RoPE, fine-tuned (long_context sibling)',lc_plain_ft:'RoPE, fine-tuned (long_context sibling)'};
    tb.innerHTML=runs.map(r=>'<tr><td>'+esc(NM[r.model]||r.model)+'</td><td>'+esc(r.scaling)+'</td>'+['0-255','256-511','512-1023','1024-2047'].map(k=>'<td class="num">'+(r[k]!=null?f2(r[k],3):k==='0-255'?'':'<span class="small">'+esc(r.error?'IndexError':'')+'</span>')+'</td>').join('')+'</tr>').join('');
    $('pe-pcCap').innerHTML='24 windows of '+fmt(L)+' validation tokens (seed 1234), mean loss per '+bin+'-token bin; learned positions stop at 255 by design ('+esc((get('ref_baseline_s1500','plain')||{}).error||'')+'). Rows marked "mistake" are the misconfigurations of Reading\'s Common mistakes.'}
  $('pe-pcLeg').addEventListener('change',e=>{const i=e.target.dataset.i;if(i!=null){on[i]=e.target.checked?1:0;drawPc()}});
  // drill 4 and the fine-tune box
  const far=['at_mha','pe_alibi','pe_nope','pe_sinusoidal_x16'].map(m=>{const r=get(m,'plain');return r?r['1024-2047']:null});
  const best=far.every(v=>v!=null)?far.indexOf(Math.min(...far)):-1;
  if(best>=0)PE.drill({id:'pe-dr4',right:best,answer:'Measured at 1,024 to 2,047: RoPE '+f2(far[0],3)+', ALiBi '+f2(far[1],3)+', NoPE '+f2(far[2],3)+', sinusoidal '+f2(far[3],3)+'. The schemes with nothing to go out of range degrade least; plain RoPE and sinusoids meet inputs they never saw.'});
  const ft=$('pe-ft');if(ft){const a=get('lc_pi_ft','linear x4 + 300 steps at 1,024'),p=get('lc_plain_ft','plain + 300 steps at 1,024'),l4=get('at_mha','linear x4');
    ft.innerHTML=a&&p?'<p>The {{Long context|n:3fd5c17b0d0d81059ee1ce20c0326dc5}} sibling continued training the RoPE model for 300 steps at 1,024 tokens (2.46M tokens, 20% of the original budget), once with PI ×4 and once with plain RoPE; this tab evaluates both checkpoints on the same windows (its own numbers agree). PI ×4 at inference only: '+f2(l4['0-255'],3)+' on 0 to 255 and '+f2(l4['512-1023'],3)+' on 512 to 1,023. After the fine-tune, PI ×4 recovers short range and fills its new window ('+f2(a['0-255'],3)+' and '+f2(a['512-1023'],3)+') but breaks again past it, '+f2(a['1024-2047'],3)+' on 1,024 to 2,047: interpolation by 4 only covers 4 × 256 = 1,024. Plain RoPE fine-tuned the same way gives '+f2(p['0-255'],3)+', '+f2(p['512-1023'],3)+' and '+f2(p['1024-2047'],3)+': it still holds at 1,024 to 2,047, twice its new training length, where the PI fine-tune does not (why the plain fine-tune extrapolates this well on short stories is not tested here). The lesson the recipes encode: a short fine-tune at the new length does most of the work, and a scaling only stretches as far as its factor.</p>'
      :'<p>'+pend+' (the long_context sibling\'s fine-tuned checkpoints).</p>';
    ft.innerHTML=ft.innerHTML.replace(/\{\{([^|{}]+)\|n:([0-9a-f]+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>')}
  const pc=$('pe-paCode');if(pc&&D.past_code){const L=D.past_code.text.split('\n');pc.innerHTML=L.map((l,i)=>'<span class="ln">'+String(D.past_code.first+i).padStart(4)+'</span>  '+esc(l)).join('\n')}
  const all=()=>{start();drawPc()};
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-past']=window.TAB_RENDER['t-past']||[]).push(all);
  addEventListener('resize',()=>{if($('pe-pa').offsetParent){if(anim)anim.redraw();drawPc()}});
  start();drawPc();
})();
