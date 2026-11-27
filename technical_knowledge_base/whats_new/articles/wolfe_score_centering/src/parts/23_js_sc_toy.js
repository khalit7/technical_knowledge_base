// ---- The live ingredient: "a token the reward ignores". A line-by-line port of moments() and traj() in src/recompute.py
// (exact sums over the 2 x 4 outcomes, no sampling); check_page.mjs compares every sigma on the 0.1 grid with
// inputs/recompute.json. The fixed inputs (starting logits, offset direction, steps) come from window.ARTICLE.toy.
(function(){
  if(!window.RD||!window.ARTICLE||!ARTICLE.toy||!document.getElementById('sc-toy'))return;
  const $=id=>document.getElementById(id), t=RD.t, C=ARTICLE.toy, AB=['A','B'], RW={A:1,B:0};
  const F={one:r=>1,tis:r=>Math.min(r,2),mis:r=>(r>=0.5&&r<=5?r:0),is:r=>r};
  const EST=[['pg','none','one',false,'+1/0, no correction','var(--c2)'],['gc','group','one',false,'group-centred','var(--c5)'],
    ['tis','group','tis',false,'+ TIS (cap 2)','var(--c1)'],['mis','group','mis',false,'+ MIS [0.5, 5]','var(--c4)'],
    ['is','group','is',false,'+ exact IS','var(--c6)'],['sc','group','one',true,'+ score centering','var(--c3)'],['sctis','group','tis',true,'+ SC with TIS','var(--c3)']];
  const sm=z=>{const m=Math.max(...z),e=z.map(x=>Math.exp(x-m)),s=e.reduce((a,b)=>a+b,0);return e.map(x=>x/s)};
  function moments(th,sig,est,thq){
    const [,base,fw,cen]=est,f=F[fw],qs=thq||th;
    const p1=sm(th[0]),q1=sm(qs[0].map((a,i)=>a+sig*C.D1[i]));
    const p2={},q2={};AB.forEach(a=>{p2[a]=sm(th[1][a]);q2[a]=sm(qs[1][a].map((x,i)=>x+sig*C.D2[a][i]))});
    const b=base==='group'?q1[0]:0;
    const centre=(p,q)=>{const c=p.map(()=>0);if(cen)for(let v=0;v<p.length;v++){const w=f(p[v]/q[v]);for(let j=0;j<p.length;j++)c[j]+=q[v]*w*((j===v?1:0)-p[j])}return c};
    const c1=centre(p1,q1),c2={A:centre(p2.A,q2.A),B:centre(p2.B,q2.B)},outs=[];
    AB.forEach((a,ia)=>{const adv=RW[a]-b,w1=f(p1[ia]/q1[ia]);
      const g1=[0,1].map(j=>adv*(w1*((j===ia?1:0)-p1[j])-c1[j]));
      for(let y=0;y<4;y++){const w2=f(p2[a][y]/q2[a][y]);
        const g2=[0,1,2,3].map(j=>adv*(w2*((j===y?1:0)-p2[a][j])-c2[a][j]));
        outs.push([q1[ia]*q2[a][y],g1.concat(a==='A'?g2.concat([0,0,0,0]):[0,0,0,0].concat(g2))])}});
    const G=[];for(let i=0;i<10;i++)G.push(outs.reduce((s,[pr,g])=>s+pr*g[i],0));
    const V=outs.reduce((s,[pr,g])=>s+pr*g.reduce((u,x,i)=>u+(x-G[i])**2,0),0);
    return {G,drift:Math.sqrt(G.slice(2).reduce((s,x)=>s+x*x,0)),sd:Math.sqrt(V),signal:G[0]/(p1[0]*(1-p1[0])),p2A:p2.A,q2A:q2.A};
  }
  const start=()=>[C.TH1.slice(),{A:C.TH2.slice(),B:C.TH2.slice()}];
  function traj(sig,est,online){
    const th=start(),th0=start(),out=[];
    for(let k=0;k<=C.T;k++){const m=moments(th,sig,est,online===false?th0:null);out.push(m.p2A[0]);const G=m.G;
      th[0]=th[0].map((x,i)=>x+C.ETA*G[i]);th[1].A=th[1].A.map((x,i)=>x+C.ETA*G[2+i]);th[1].B=th[1].B.map((x,i)=>x+C.ETA*G[6+i])}
    return out;
  }
  window.SC_TOY={grid:s=>{const o={};EST.forEach(e=>{const m=moments(start(),s,e),tr=traj(s,e);o[e[0]]={drift:m.drift,sd:m.sd,signal:m.signal,t100:tr[100],tend:tr[C.T]}});
    const off=traj(s,EST[0],false);o.pg_off={t100:off[100],tend:off[C.T]};o.q_w=moments(start(),s,EST[0]).q2A[0];return o}};
  let sig=0;
  const f3=v=>Math.abs(v)<5e-7?'0':v.toFixed(3);
  function drawPQ(m){
    const el=$('sc-pq'),W=RD.width(el),L=8,R=W-8,H=104,y0=82,bw=(R-L)/4,names=['w','x','y','z'];
    let s='';
    for(let i=0;i<4;i++){const x=L+i*bw,h1=m.p2A[i]*70,h2=m.q2A[i]*70,cw=Math.min(28,bw*0.3);
      s+='<rect x="'+(x+bw/2-cw-2)+'" y="'+(y0-h1)+'" width="'+cw+'" height="'+h1+'" rx="2" fill="var(--c1)"/>';
      s+='<rect x="'+(x+bw/2+2)+'" y="'+(y0-h2)+'" width="'+cw+'" height="'+h2+'" rx="2" fill="var(--c2)" opacity=".85"/>';
      s+=t(x+bw/2,y0+16,names[i]+': '+m.p2A[i].toFixed(2)+' / '+m.q2A[i].toFixed(2),{a:'middle',fs:11.5,fill:'var(--ink)'})}
    s='<line x1="'+L+'" x2="'+R+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)"/>'+s;
    el.innerHTML=RD.svg(W,H,s,'Trainer and sampler probabilities of the four filler tokens after A');
  }
  function drawTab(){
    const rows=EST.map(e=>{const m=moments(start(),sig,e);return '<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;background:'+e[5]+'"></i>'+e[4]+'</td><td'+(m.drift<5e-7?' class="z"':'')+'>'+f3(m.drift)+'</td><td>'+m.sd.toFixed(3)+'</td><td>'+m.signal.toFixed(3)+'</td></tr>'});
    $('sc-tab').innerHTML='<tr><th>update</th><th>drift</th><th>spread</th><th>path</th></tr>'+rows.join('');
  }
  const SHOW=['pg','gc','tis','mis','sc'];
  function drawTraj(){
    const el=$('sc-traj'),W=RD.width(el),L=34,R=W-10,T0=8,B=150,X=k=>L+k/C.T*(R-L),Y=v=>B-(v-0.2)/0.8*(B-T0);
    let s='';
    [0.2,0.4,0.6,0.8,1].forEach(v=>{s+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(L-4,Y(v)+4,v.toFixed(1),{a:'end',fs:11,fill:'var(--mute)'})});
    [0,100,200,300,400].forEach(k=>{s+=t(X(k),B+15,k,{a:'middle',fs:11,fill:'var(--mute)'})});
    const path=(tr,col,dash,w)=>'<path d="'+tr.map((v,k)=>(k?'L':'M')+X(k).toFixed(1)+' '+Y(v).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="'+(w||2)+'"'+(dash?' stroke-dasharray="5 4"':'')+'/>';
    s+=path(traj(sig,EST[0],false),'var(--mute)',true,1.6);
    EST.filter(e=>SHOW.includes(e[0])).forEach(e=>{s+=path(traj(sig,e),e[5],false,e[0]==='sc'?3:2)});
    el.innerHTML=RD.svg(W,B+20,s,'Trainer probability of filler token w after A over 400 steps for each update rule');
    $('sc-lg').innerHTML=EST.filter(e=>SHOW.includes(e[0])).map(e=>'<span><i style="background:'+e[5]+'"></i>'+e[4]+'</span>').join('')+'<span><i class="dash"></i>+1/0, sampler frozen (offline)</span>';
  }
  function draw(){$('sc-sigv').textContent=sig.toFixed(1);drawPQ(moments(start(),sig,EST[0]));drawTab();drawTraj()}
  $('sc-sig').addEventListener('input',e=>{sig=+e.target.value;draw()});
  RD.onRender(draw); RD.onResize(draw);
})();
