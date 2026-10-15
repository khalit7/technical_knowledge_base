// ---- TPU programming and performance: shared formulas and helpers (prefix tq). Same formulas as src/runs/tq_recompute.py ----
window.TQU=(function(){
  const D=window.TQ;
  const G={};D.gens.forEach(g=>G[g.gen]=g);
  const GEN_ORDER=['v4','v5e','v5p','v6e','7x'];
  const GEN_COLOR={v4:'var(--c5)',v5e:'var(--c3)',v5p:'var(--c1)',v6e:'var(--c2)','7x':'var(--c4)'};
  const label=k=>k==='7x'?'TPU7x':k;
  // numbers
  const fmt=(v,d)=>{if(v===null||v===undefined||!isFinite(v))return 'n/a';return v.toLocaleString('en-US',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d})};
  const sig=(v,s)=>{if(!isFinite(v))return 'n/a';if(v===0)return '0';const p=Math.floor(Math.log10(Math.abs(v)));const d=Math.max(0,(s||3)-1-p);return fmt(v,Math.min(d,6))};
  const si=(v,u)=>{const a=Math.abs(v);const t=[[1e18,'E'],[1e15,'P'],[1e12,'T'],[1e9,'G'],[1e6,'M'],[1e3,'k']];for(const [m,s] of t)if(a>=m)return sig(v/m,3)+' '+s+(u||'');return sig(v,3)+' '+(u||'')};
  const time=s=>s>=1?sig(s,3)+' s':s>=1e-3?sig(s*1e3,3)+' ms':sig(s*1e6,3)+' µs';
  const bytes=b=>b>=2**30?sig(b/2**30,3)+' GiB':b>=2**20?sig(b/2**20,3)+' MiB':b>=1024?sig(b/1024,3)+' KiB':fmt(b)+' B';
  const gb=b=>sig(b/1e9,3)+' GB';
  const pct=(v,d)=>fmt(v*100,d===undefined?1:d)+'%';
  // matmul roofline: [m,k] x [k,n], b copies; bytes per element of activation, weight, output
  function mm(b,m,k,n,ba,bw,bo){ba=ba||2;bw=bw||2;bo=bo||2;return {fl:2*b*m*k*n,by:b*(m*k*ba+k*n*bw+m*n*bo)}}
  function bound(fl,by,peak,bw){const tc=fl/peak,tm=by/bw;return {t:Math.max(tc,tm),compute:tc>=tm,ai:fl/by,frac:Math.min(1,(fl/by)*bw/peak)}}
  // decode lower bound (scaling book): Llama 2 7B by default
  const L7={D:4096,F:11008,L:32,Hq:32,Hkv:32,dh:128,V:32000,P:6738415616};
  function kvTok(m,kvb){m=m||L7;return 2*m.L*m.Hkv*m.dh*(kvb||2)}
  // m: {P: parameters, VD: embedding parameters only gathered (not read by matmuls)}; kvt: KV-cache bytes per token; peak: per-chip FLOP/s of the compute dtype
  function decode(g,B,T,chips,wb,kvt,m,peak){m=m||{P:L7.P,VD:L7.V*L7.D};kvt=kvt===undefined?kvTok():kvt;const bw=g.bw*chips,pk=(peak||g.bf16)*chips,pmm=m.P-m.VD;
    const att=B*kvt*T/bw,lin=Math.max(2*B*pmm/pk,pmm*wb/bw),mem=m.P*wb+B*kvt*T;
    return {att,lin,step:att+lin,tok:B/(att+lin),mem,fits:mem<=g.hbm*chips,linCompute:2*B*pmm/pk>=pmm*wb/bw}}
  // tiling and MXU padding (XLA docs/tiled_layout.md rules; MXU side S)
  const pad=(v,m)=>Math.ceil(v/m)*m;
  function hbmTile(r,c){const t=r<=2?2:r<=4?4:8;return {padded:pad(r,t)*pad(c,128),t,rows:pad(r,t),cols:pad(c,128)}}
  function mxuUtil(m,k,n,S){return m*k*n/(pad(m,8)*pad(k,S)*pad(n,S))}
  // bf16 round to nearest even (float32 bit pattern)
  const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer);
  function bf16(x){f32[0]=x;let u=u32[0];if((u&0x7f800000)===0x7f800000){u32[0]=u&0xffff0000;return f32[0]}
    const lsb=(u>>>16)&1;u=(u+0x7fff+lsb)>>>0;u32[0]=u&0xffff0000;return f32[0]}
  const fr=x=>Math.fround(x);
  function split3(x){x=fr(x);const hi=bf16(x),r=fr(x-hi),mid=bf16(r),lo=bf16(fr(r-mid));return [hi,mid,lo]}
  // svg helpers
  const S=(w,h,body,lab)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(lab||'')+'">'+body+'</svg>';
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // segmented control: el gets buttons; f(value)
  function seg(el,items,cur,f){el.insertAdjacentHTML('beforeend',items.map(([v,t])=>'<button type="button" data-v="'+v+'"'+(v===cur?' class="on"':'')+'>'+t+'</button>').join(''));
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.v)})}
  // predict-then-reveal blocks
  function predict(id){const el=document.getElementById(id);if(!el)return;el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a==='1');if(x===b&&x.dataset.a!=='1')x.classList.add('wrong')});el.querySelector('.ans').hidden=false})}
  // a table from rows; cols: [header, fn(row)->html, cls]; optional sort on header click
  function table(el,cols,rows,opt){opt=opt||{};let sortI=-1,dir=1;
    function draw(){let rs=rows.slice();if(sortI>=0&&cols[sortI][3]){const k=cols[sortI][3];rs.sort((a,b)=>dir*((k(a)??-1e99)-(k(b)??-1e99)))}
      el.innerHTML='<table'+(opt.narrow?' class="narrow"':'')+'><thead><tr>'+cols.map((c,i)=>'<th'+(c[2]?' class="'+c[2]+'"':'')+(c[3]?' style="cursor:pointer" data-i="'+i+'"':'')+'>'+c[0]+(i===sortI?(dir>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+
      rs.map((r,j)=>'<tr'+(opt.rowAttr?opt.rowAttr(r,j):'')+'>'+cols.map(c=>'<td'+(c[2]?' class="'+c[2]+'"':'')+'>'+c[1](r)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
    el.addEventListener('click',e=>{const th=e.target.closest('th[data-i]');if(!th)return;const i=+th.dataset.i;dir=(sortI===i)?-dir:-1;sortI=i;draw()});draw();return {draw}}
  // tab render registration
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  function onResize(id,f){let t=0;addEventListener('resize',()=>{const el=document.getElementById(id);if(!el||el.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  return {D,G,GEN_ORDER,GEN_COLOR,label,fmt,sig,si,time,bytes,gb,pct,mm,bound,L7,kvTok,decode,pad,hbmTile,mxuUtil,bf16,split3,fr,S,tx,width,seg,predict,table,onTab,onResize};
})();
