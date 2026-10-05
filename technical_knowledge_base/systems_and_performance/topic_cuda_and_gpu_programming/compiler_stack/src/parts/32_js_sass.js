// ---- Tab "SASS, decoded": scoreboard replay over real decoded instructions ----
(function(){
  const D=window.CSD,E=RD.esc,$=id=>document.getElementById(id);
  const names={'softmax.sm_90a':'row softmax, sm_90a (H100)','softmax.sm_100a':'row softmax, sm_100a (B200)','k3_matmul_tiled.sm_90a':'tiled matmul (shared memory), sm_90a','k8_wgmma.sm_90a':'one wgmma tile (Hopper tensor cores), sm_90a'};
  $('sx-k').innerHTML=Object.keys(D.sass).map(k=>'<option value="'+k+'">'+E(names[k]||k)+'</option>').join('');
  let K='softmax.sm_90a',R=D.sass[K],trace=[];
  // row: [off,pred,op,args,stall,yield,wbar,rbar,wait,reuse,live,hi]
  const regsOf=s=>{const out=[];s.replace(/(?<![A-Z])R(\d+)(\.64|\.128)?/g,(m,n,w)=>{n=+n;const k=w==='.64'?2:w==='.128'?4:1;for(let j=0;j<k;j++)out.push('R'+(n+j));return m});return out};
  function build(){trace=[];let sb=[null,null,null,null,null,null],cyc=0;
    R.forEach((r,i)=>{const rel=[];for(let b=0;b<6;b++)if(r[8]>>b&1){if(sb[b])rel.push([b,sb[b]]);sb[b]=null}
      const before=sb.slice();
      if(r[6]!==7){const dst=/^(ST|BAR|BRA|EXIT|RED)/.test(r[2])?[]:regsOf((r[3].split(/,(?![^\[]*\])/)[r[2].startsWith('SHFL')?1:0]||'').split('[')[0]);sb[r[6]]={i:i,regs:dst,op:r[2]}}
      if(r[7]!==7)sb[r[7]]={i:i,regs:regsOf(r[3]),op:r[2],read:true};
      cyc+=r[4];trace.push({sb:sb.slice(),rel:rel,cyc:cyc});});}
  const hex=n=>'/*'+n.toString(16).padStart(4,'0')+'*/';
  const line=r=>hex(r[0])+' '+(r[1]?r[1]+' ':'')+r[2]+' '+r[3];
  function draw(i){const r=R[i],t=trace[i];
    const waits=[0,1,2,3,4,5].filter(b=>r[8]>>b&1);
    let cap='<b>'+E(line(r))+'</b><br>';
    cap+=(t.rel.length?'Waits for '+t.rel.map(x=>'SB'+x[0]+' (set by '+E(x[1].op)+' at '+hex(R[x[1].i][0])+')').join(', ')+'. ':waits.length?'Waits on SB'+waits.join(', SB')+' (already free). ':'')+
      (r[6]!==7?'Sets SB'+r[6]+': its result arrives later than a fixed latency. ':'')+(r[7]!==7?'Sets read barrier SB'+r[7]+': its source registers must not be overwritten until it has read them. ':'')+
      'Then '+r[4]+' stall cycle'+(r[4]===1?'':'s')+(r[5]?', yield bit set (prefer this warp next).':', yield bit clear (prefer another warp).');
    if(D.opdesc[r[2].split('.')[0]])cap+=' <span class="mute">'+E(r[2].split('.')[0])+': '+E(D.opdesc[r[2].split('.')[0]])+'.</span>';
    $('sx-cap').innerHTML=cap;
    $('sx-sb').innerHTML=t.sb.map((s,b)=>{const rel=t.rel.find(x=>x[0]===b);return '<div class="'+(s?'busy':rel?'rel':'')+'"><b>SB'+b+'</b>'+(s?E((s.read?'read: ':'')+(s.regs.join(' ')||'(no register)'))+'<br><span class="mute">'+E(s.op)+'</span>':rel?'released':'<span class="mute">free</span>')+'</div>'}).join('');
    const prod=new Set(t.rel.map(x=>x[1].i));const a=Math.max(0,i-5),b=Math.min(R.length,i+6);
    $('sx-win').innerHTML=R.slice(a,b).map((x,j)=>'<div class="'+(a+j===i?'cur':prod.has(a+j)?'prod':'')+'">'+E(line(x))+'</div>').join('')+(prod.size&&[...prod].some(p=>p<a)?'<div class="prod">'+[...prod].filter(p=>p<a).map(p=>E('producer: '+line(R[p]))).join('\n')+'</div>':'');
    const tr=$('sx-t').querySelectorAll('tr[data-i]');tr.forEach(x=>x.classList.remove('cur'));if(tr[i]){tr[i].classList.add('cur')}
    $('sx-sumC').textContent=t.cyc;}
  let an=null;
  function prep(){build();summary();table()}
  function table(){const mx=Math.max(...R.map(r=>r[10]||0));
    $('sx-t').innerHTML='<tr><th>off</th><th>instruction</th><th>S</th><th>Y</th><th>W</th><th>R</th><th>wait</th><th>reuse</th><th>live</th></tr>'+R.map((r,i)=>'<tr data-i="'+i+'"><td>'+r[0].toString(16).padStart(4,'0')+'</td><td>'+E((r[1]?r[1]+' ':'')+r[2]+' '+r[3])+'</td><td class="n">'+r[4]+'</td><td class="n">'+r[5]+'</td><td class="n">'+(r[6]===7?'':r[6])+'</td><td class="n">'+(r[7]===7?'':r[7])+'</td><td>'+(r[8]?[0,1,2,3,4,5].filter(b=>r[8]>>b&1).join(','):'')+'</td><td>'+(r[9]?r[9].toString(2).padStart(4,'0'):'')+'</td><td><span class="sx-lv" style="width:'+(r[10]?Math.round(40*r[10]/mx):0)+'px"></span> '+(r[10]||'')+'</td></tr>').join('');}
  $('sx-t').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;an.go(+tr.dataset.i);$('sx-card').scrollIntoView({block:'nearest'})});
  function summary(){const ck=D.sass_check[K];const st=R.reduce((s,r)=>s+r[4],0),nsb=R.filter(r=>r[6]!==7).length;
    $('sx-sum').innerHTML='<div style="--sc:var(--c1)"><div class="k">instructions</div><div class="v">'+R.length+'</div><p>including end padding</p></div><div style="--sc:var(--c2)"><div class="k">set a write scoreboard</div><div class="v">'+nsb+'</div><p>variable-latency results</p></div><div style="--sc:var(--c5)"><div class="k">issue cycles so far / total</div><div class="v"><span id="sx-sumC">0</span> / '+st+'</div><p>sum of stall counts</p></div><div style="--sc:var(--c3)"><div class="k">decoding check</div><div class="v">'+ck[1]+' violations</div><p>'+ck[2]+' of '+ck[3]+' first readers wait; max '+ck[4]+' live registers</p></div>';}
  function load(k){K=k;R=D.sass[K];prep();an.reset(R.length)}
  $('sx-k').addEventListener('change',e=>load(e.target.value));
  prep();
  an=RD.anim({card:'sx-card',ctl:'sx-ctl',n:R.length,draw:(i)=>draw(i),ms:700,label:'Instruction'});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sass']=[()=>an.redraw()];
})();
