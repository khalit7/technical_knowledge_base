// ---- Sharding lab, section 2: PartitionSpec playground (108 real compilations) and the predict-the-collective drill ----
(function(){
  const S=window.SH,D=S.D,$=S.$;if(!D||!$('sh-pg-svg'))return;
  const P=D.pg,MESH=P.mesh,esc=S.esc;
  // row: [x, w, out, x_shard, w_shard, y_spec, y_shard, coll[[kind, bytes, group]], temp, max_err]
  const find=(x,w,o)=>P.rows.find(r=>r[0]===x&&r[1]===w&&r[2]===o);
  const XS=[...new Set(P.rows.map(r=>r[0]))],WS=[...new Set(P.rows.map(r=>r[1]))];
  const OUT=[['auto','compiler\'s choice'],['data','<code>P(\'data\', None)</code>'],['rep','replicated <code>P()</code>']];
  let cx="P('data', None)",cw="P(None, 'model')",co='auto';
  // which block of each dimension device (r, c) holds, for a spec string on the ('data', 'model') mesh
  const parse=s=>{const inner=s.slice(2,-1).trim();if(!inner)return [];return inner.split(',').map(t=>t.trim().replace(/'/g,'')).map(t=>t==='None'?null:t)};
  const n={data:2,model:4};
  function blockOf(spec,ndim,r,c){const p=parse(spec);const out=[];for(let i=0;i<ndim;i++){const a=p[i]||null;out.push(a==='data'?[r,2]:a==='model'?[c,4]:[0,1])}return out}
  function panel(x0,y0,pw,ph,name,shape,spec){
    const ar=shape[1]/shape[0],k=Math.min(3,Math.max(1/2,ar));let w=pw,h=pw/k;if(h>ph){h=ph;w=ph*k}
    let s=S.tx(x0,y0+11,name+' ['+shape.join(', ')+']',{fs:11,w:600})+S.tx(x0,y0+24,esc(spec),{fs:10.5,fill:'var(--mute)'});
    const ox=x0,oy=y0+30;s+='<rect x="'+ox+'" y="'+oy+'" width="'+w+'" height="'+h+'" fill="var(--soft)" stroke="var(--mute)"/>';
    const groups={};for(let r=0;r<2;r++)for(let c=0;c<4;c++){const b=blockOf(spec,2,r,c),key=b.map(v=>v.join('/')).join('|');(groups[key]=groups[key]||{b,devs:[]}).devs.push(MESH[r][c])}
    Object.values(groups).forEach((g,gi)=>{const [rb,cb]=g.b;const bx=ox+w*cb[0]/cb[1],by=oy+h*rb[0]/rb[1],bw=w/cb[1],bh=h/rb[1];
      s+='<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="hsl('+[210,25,140,275,45,180,330,95][gi%8]+',55%,52%)" fill-opacity=".45" stroke="var(--ink)" stroke-width=".6"/>';
      if(bw>22&&bh>12)s+=S.tx(bx+bw/2,by+bh/2+4,g.devs.length===8?'all 8':g.devs.join(','),{fs:bw>40?10:8.5,a:'middle'})});
    return s;
  }
  function draw(){
    const r=find(cx,cw,co);if(!r)return;
    const host=$('sh-pg-svg'),W=S.width(host),wide=W>=560;
    const pw=wide?(W-40)/3:Math.min(W-10,260),ph=wide?150:130;let body='',H;
    if(wide){body+=panel(5,0,pw,ph,'x',P.x_shape,r[0])+S.tx(5+pw+10,95,'@',{fs:16})+panel(25+pw,0,pw,ph,'W',P.w_shape,r[1])+S.tx(25+2*pw+5,95,'=',{fs:16})+panel(35+2*pw,0,pw,ph,'y',[P.x_shape[0],P.w_shape[1]],r[5]);H=ph+40}
    else{body+=panel(5,0,pw,ph,'x',P.x_shape,r[0])+panel(5,ph+40,pw,ph,'W',P.w_shape,r[1])+panel(5,2*ph+80,pw,ph,'y',[P.x_shape[0],P.w_shape[1]],r[5]);H=3*ph+120}
    host.innerHTML=S.svg(W,H,body,'x, W and y with the blocks each device holds');
    const cs=r[7],tot=cs.reduce((a,c)=>a+S.ring(c[0],c[1],c[2]),0);
    const list=cs.length?cs.map(c=>S.chip(c[0])+' '+S.fmtB(c[1])+(c[0]==='collective-permute'?' (pairs)':' over groups of '+c[2])).join('; '):'<b>none</b>: every device computes its block of y from blocks it already holds';
    $('sh-pg-cap').innerHTML='<b>Output the compiler gave:</b> <code>'+esc(r[5])+'</code>, per-device y shard ['+r[6].join(', ')+']. <b>Collectives inserted:</b> '+list+'.'+(co==='auto'?'':' (You asked for '+(co==='rep'?'a replicated output':'<code>P(\'data\', None)</code>')+'.)')+' Labels in the blocks are the device ids that hold them; shapes are not to scale.';
    $('sh-pg-cnt').innerHTML=S.stat('x shard per device','['+r[3].join(', ')+']','')+S.stat('W shard per device','['+r[4].join(', ')+']','')+S.stat('collectives',cs.length,'')+S.stat('sent per device',S.fmtB(tot),'ring cost')+S.stat('temp memory',S.fmtB(r[8]),'memory_analysis')+S.stat('max error vs numpy',r[9].toExponential(1),'float32');
  }
  S.seg($('sh-pg-x'),XS.map(s=>[s,'<code>'+esc(s)+'</code>']),cx,v=>{cx=v;draw()});
  S.seg($('sh-pg-w'),WS.map(s=>[s,'<code>'+esc(s)+'</code>']),cw,v=>{cw=v;draw()});
  S.seg($('sh-pg-o'),OUT,co,v=>{co=v;draw()});
  S.onRender(draw);S.onResize(draw);draw();
  // drill
  const cases=[["P('data', None)","P(None, 'model')",'auto'],["P(None, 'model')","P('model', None)",'auto'],["P('data', None)","P('model', None)",'auto'],
    ["P(None, 'data')","P()",'data'],["P('data', None)","P(None, 'model')",'data'],["P('data', 'model')","P('model', None)",'auto']];
  const opts=['none','all-reduce','all-gather','all-to-all','collective-permute'];let ci=0,score=0,tried=0,done=false;
  function ask(){const c=cases[ci],r=find(c[0],c[1],c[2]);done=false;
    $('sh-dr-q').innerHTML='Predict: x <code>'+esc(c[0])+'</code> @ W <code>'+esc(c[1])+'</code>, output '+(c[2]==='auto'?'left to the compiler':'constrained to <code>P(\'data\', None)</code>')+'. Which collective does XLA insert?';
    $('sh-dr-opts').innerHTML=opts.map(o=>'<button data-o="'+o+'">'+o+'</button>').join('');$('sh-dr-ans').innerHTML='';
    $('sh-dr-opts').onclick=e=>{const b=e.target.closest('button');if(!b||done)return;done=true;tried++;
      const kinds=[...new Set(r[7].map(x=>x[0]))],truth=kinds.length?kinds[0]:'none',ok=b.dataset.o===truth;if(ok)score++;
      [...$('sh-dr-opts').children].forEach(x=>{if(x.dataset.o===truth)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
      const why={none:'Each device already holds everything its block of y needs.','all-reduce':'Both operands are split along the summed dimension (the 128): each device holds a partial sum, and the parts must be added.','all-gather':'Some device needs a piece of an operand (or of y) that others hold, so the split one is gathered.','all-to-all':'The result is split along one dimension and you asked for it split along another: every device sends a piece to every other.','collective-permute':'The blocks exist but sit on the wrong devices.'}[truth];
      $('sh-dr-ans').innerHTML=(ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+'The compiled HLO holds '+(r[7].length?r[7].map(x=>S.chip(x[0])+' '+S.fmtB(x[1])).join(' '):'no collective')+'. '+why;
      $('sh-dr-score').textContent=score+' of '+tried+' right'}}
  $('sh-dr-next').addEventListener('click',()=>{ci=(ci+1)%cases.length;ask()});ask();
})();
