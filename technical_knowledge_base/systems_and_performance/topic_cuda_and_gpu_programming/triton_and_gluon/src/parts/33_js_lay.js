// ---- Layout explorer tab (t-lay) ----
// TG_bases: blocked layout -> linear-layout bases (row, col), as Triton converts it; checked against Triton's printed
// to_linear_layout output (src/out/gluon.json) by src/check/check_js.mjs and live on the tab.
window.TG_bases=function(spt,tpw,wpc,order,shape){
  const lg=x=>Math.round(Math.log2(x)),mk=(d,v)=>{const b=[0,0];b[d]=v<shape[d]?v:0;return b};
  const reg=[],lane=[],warp=[];
  order.forEach(d=>{for(let i=0;i<lg(spt[d]);i++)reg.push(mk(d,1<<i))});
  order.forEach(d=>{for(let i=0;i<lg(tpw[d]);i++)lane.push(mk(d,spt[d]<<i))});
  order.forEach(d=>{for(let i=0;i<lg(wpc[d]);i++)warp.push(mk(d,(spt[d]*tpw[d])<<i))});
  order.forEach(d=>{const blk=spt[d]*tpw[d]*wpc[d],reps=Math.max(shape[d]/blk,1);for(let i=0;i<lg(reps);i++)reg.push(mk(d,blk<<i))});
  return {reg,lane,warp};
};
window.TG_owners=function(B,shape){
  const g=new Map();
  for(let w=0;w<(1<<B.warp.length);w++)for(let l=0;l<(1<<B.lane.length);l++)for(let r=0;r<(1<<B.reg.length);r++){
    let y=0,x=0;[[r,B.reg],[l,B.lane],[w,B.warp]].forEach(([bits,bs])=>bs.forEach((b,i)=>{if(bits>>i&1){y^=b[0];x^=b[1]}}));
    const k=y*shape[1]+x;if(!g.has(k))g.set(k,[]);g.get(k).push([w*32+l,r])}
  return g;
};
(function(){
  const D=window.TGD,$=id=>document.getElementById(id);
  const SPT=[[1,1],[1,2],[1,4],[1,8],[2,1],[2,2],[2,4],[4,1],[4,4],[8,1]],TPW=[[1,32],[2,16],[4,8],[8,4],[16,2],[32,1]],WPC=[[1,1],[1,2],[2,1],[2,2],[4,1],[1,4],[8,1],[2,4]],
    SH=[[8,8],[16,16],[16,64],[32,8],[32,32],[32,128],[64,16],[64,64],[128,32],[128,128]];
  const opt=(el,arr)=>{el.innerHTML=arr.map(a=>'<option value="'+a.join(',')+'">['+a.join(', ')+']</option>').join('')};
  opt($('ly-spt'),SPT);opt($('ly-tpw'),TPW);opt($('ly-wpc'),WPC);$('ly-shape').innerHTML=SH.map(a=>'<option value="'+a.join(',')+'">'+a[0]+' x '+a[1]+'</option>').join('');
  const P=D.gluon.layouts.map((c,i)=>({name:'Triton printed '+(i+1)+': ['+c.spt+'] ['+c.tpw+'] ['+c.wpc+'] order ['+c.order+'] on '+c.shape.join(' x '),c}));
  $('ly-pre').innerHTML='<option value="-1">(custom)</option>'+P.map((p,i)=>'<option value="'+i+'">'+p.name+'</option>').join('');
  const parse=s=>{const o={};['reg_bases','lane_bases','warp_bases'].forEach(k=>{const m=s.match(new RegExp(k+'=(\\[\\[.*?\\]\\]|\\[\\])'));o[k]=m?JSON.parse(m[1]):[]});return o};
  const v=id=>$(id).value.split(',').map(Number);
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--ink)'];
  function setSel(id,val){const el=$(id);const s=val.join(',');if([...el.options].some(o=>o.value===s))el.value=s}
  function render(){
    const spt=v('ly-spt'),tpw=v('ly-tpw'),wpc=v('ly-wpc'),order=v('ly-ord'),shape=v('ly-shape');
    const B=TG_bases(spt,tpw,wpc,order,shape),G=TG_owners(B,shape),nT=wpc[0]*wpc[1]*32,regs=1<<B.reg.length;
    const thr=$('ly-thr');thr.max=nT-1;if(+thr.value>nT-1)thr.value=0;const T=+thr.value;$('ly-thrv').textContent=T+' (warp '+(T>>5)+', lane '+(T&31)+')';
    const dup=nT*regs/(shape[0]*shape[1]);
    $('ly-stats').innerHTML=RD.stat('Block covered by one layout tile',(spt[0]*tpw[0]*wpc[0])+' x '+(spt[1]*tpw[1]*wpc[1]))+RD.stat('Registers per thread for this tensor',regs,'elements per thread')+RD.stat('Threads',nT,wpc[0]*wpc[1]+' warps')+RD.stat('Copies of each element',dup,dup>1?'broadcast: duplicated data':'no duplication');
    $('ly-leg').innerHTML=Array.from({length:wpc[0]*wpc[1]},(_,w)=>'<span style="--sw:'+COL[w%8]+'">warp '+w+'</span>').join('');
    const box=$('ly-grid'),W=Math.max(280,Math.min(880,RD.width(box))),cs=Math.max(2,Math.min(44,Math.floor((W-30)/shape[1]))),Hh=shape[0]*cs+18,Ww=shape[1]*cs+28;
    const lab=cs>=34;
    let g='';
    for(let y=0;y<shape[0];y++)for(let x=0;x<shape[1];x++){const o=G.get(y*shape[1]+x)||[],f=o[0],mine=o.some(t=>t[0]===T);
      const w=f?f[0]>>5:0,ln=f?f[0]&31:0;
      g+='<rect x="'+(24+x*cs)+'" y="'+(14+y*cs)+'" width="'+(cs-(cs>3?1:0))+'" height="'+(cs-(cs>3?1:0))+'" fill="'+COL[w%8]+'" fill-opacity="'+(0.35+0.5*((ln%8)/7)).toFixed(2)+'"'+(mine?' stroke="var(--ink)" stroke-width="'+(cs>6?2:1)+'"':'')+'/>';
      if(lab)g+='<text x="'+(24+x*cs+cs/2)+'" y="'+(14+y*cs+cs/2+3.5)+'" text-anchor="middle" font-size="9.5">T'+f[0]+':'+f[1]+'</text>';
      if(o.length>1&&cs>=14)g+='<text x="'+(24+x*cs+cs-3)+'" y="'+(14+y*cs+9)+'" text-anchor="end" font-size="8" fill="var(--bad)">'+o.length+'</text>'}
    for(let y=0;y<shape[0];y+=Math.max(1,Math.round(16/cs)*2||1))if(cs>=8||y%8===0)g+=RD.t(20,14+y*cs+Math.min(cs,12)*0.8,String(y),{a:'end',fs:9,fill:'var(--mute)'});
    box.innerHTML=RD.svg(Ww,Hh,g,'Layout map');
    const fm=b=>'['+b.map(x=>'['+x.join(',')+']').join(', ')+']';
    $('ly-bases').textContent='reg_bases  = '+fm(B.reg)+'\nlane_bases = '+fm(B.lane)+'\nwarp_bases = '+fm(B.warp);
    const pi=+$('ly-pre').value;let chk='';
    if(pi>=0){const c=P[pi].c,same=c.spt.join()===spt.join()&&c.tpw.join()===tpw.join()&&c.wpc.join()===wpc.join()&&c.order.join()===order.join()&&c.shape.join()===shape.join();
      if(same){const t=parse(c.printed),ok=fm(t.reg_bases)===fm(B.reg)&&fm(t.lane_bases)===fm(B.lane)&&fm(t.warp_bases)===fm(B.warp);
        chk='<p class="small">Triton 3.8.0 printed for this layout: <code>'+RD.esc(c.printed.replace('DistributedLinearLayout',''))+'</code> <span class="'+(ok?'ok':'bad')+'">'+(ok?'matches':'differs')+'</span></p>'}}
    $('ly-check').innerHTML=chk;
  }
  $('ly-pre').addEventListener('change',()=>{const i=+$('ly-pre').value;if(i<0)return;const c=P[i].c;setSel('ly-spt',c.spt);setSel('ly-tpw',c.tpw);setSel('ly-wpc',c.wpc);setSel('ly-ord',c.order);setSel('ly-shape',c.shape);render()});
  ['ly-spt','ly-tpw','ly-wpc','ly-ord','ly-shape'].forEach(id=>$(id).addEventListener('change',()=>{const i=+$('ly-pre').value;render();if(i>=0&&!$('ly-check').innerHTML)$('ly-pre').value='-1'}));
  $('ly-thr').addEventListener('input',render);
  $('ly-pre').value='0';$('ly-pre').dispatchEvent(new Event('change'));
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lay']=window.TAB_RENDER['t-lay']||[]).push(render);
  RD.onResize&&addEventListener('resize',()=>{const t=$('t-lay');if(t&&!t.hidden)render()});
})();
