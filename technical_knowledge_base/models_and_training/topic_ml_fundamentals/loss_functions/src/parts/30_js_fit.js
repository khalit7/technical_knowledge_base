// ---- Fit a line tab: every regression loss on the same data, exact fits, per-point pulls ----
(function(){
  const card=document.getElementById('ft-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const KEYS=['mse','mae','huber','logcosh','pinball','mape'];
  const COL={mse:'var(--c1)',mae:'var(--c2)',huber:'var(--c3)',logcosh:'var(--c4)',pinball:'var(--c5)',mape:'var(--c6)'};
  const st={ds:'a3',on:{mse:1,mae:1,huber:1,logcosh:0,pinball:0,mape:0},delta:1,tau:0.9,insp:'huber',own:null};
  const A=LD.anscombe3,S=LD.stars,G=S.giants.map(g=>g-1);
  function data(){
    if(st.ds==='a3')return {x:A.x.slice(),y:A.y.slice(),xr:[2,16],yr:[3,14],hl:[2]};
    if(st.ds==='a3c')return {x:A.x.filter((v,i)=>i!==2),y:A.y.filter((v,i)=>i!==2),xr:[2,16],yr:[3,14],hl:[]};
    if(st.ds==='st')return {x:S.x.slice(),y:S.y.slice(),xr:[3.3,4.8],yr:[3,6.8],hl:G};
    if(st.ds==='stm')return {x:S.x.filter((v,i)=>!G.includes(i)),y:S.y.filter((v,i)=>!G.includes(i)),xr:[3.3,4.8],yr:[3,6.8],hl:[]};
    return {x:st.own.x,y:st.own.y,xr:st.own.xr,yr:st.own.yr,hl:[]};
  }
  // controls
  $('ft-ls').innerHTML=KEYS.map(k=>'<label><input type="checkbox" data-k="'+k+'"'+(st.on[k]?' checked':'')+'> <span class="sw" style="background:'+COL[k]+'"></span>'+LF.REG[k].name+'</label>').join('');
  $('ft-ls').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;st.on[k]=e.target.checked?1:0;if(e.target.checked)st.insp=k;fillInsp();draw()});
  function fillInsp(){const ks=KEYS.filter(k=>st.on[k]);if(!ks.includes(st.insp))st.insp=ks[0]||'mse';$('ft-in').innerHTML=(ks.length?ks:['mse']).map(k=>'<option value="'+k+'"'+(k===st.insp?' selected':'')+'>'+LF.REG[k].name+'</option>').join('')}
  $('ft-in').addEventListener('change',e=>{st.insp=e.target.value;draw()});
  $('ft-d').addEventListener('input',e=>{st.delta=Math.pow(10,(e.target.value-50)/50);draw()});
  $('ft-t').addEventListener('input',e=>{st.tau=e.target.value/100;draw()});
  $('ft-ds').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('ft-ds').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));
    st.ds=b.dataset.d;if(st.ds==='own'&&!st.own){const d={x:A.x.filter((v,i)=>i!==2),y:A.y.filter((v,i)=>i!==2)};st.own={x:d.x,y:d.y,xr:[0,18],yr:[0,16]}}draw()});
  function click(x,y,ev){
    if(st.ds!=='own'){const d=data();st.own={x:d.x.slice(),y:d.y.slice(),xr:d.xr,yr:d.yr};st.ds='own';[...$('ft-ds').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.d==='own'))}
    const o=st.own;let hit=-1;o.x.forEach((xi,i)=>{if(Math.hypot(ev.sx(xi)-ev.px,ev.sy(o.y[i])-ev.py)<11)hit=i});
    if(hit>=0){if(o.x.length>3){o.x.splice(hit,1);o.y.splice(hit,1)}}else{o.x.push(+x.toFixed(3));o.y.push(+y.toFixed(3))}
    draw();
  }
  function draw(){
    $('ft-dv').textContent=st.delta<1?st.delta.toFixed(2):st.delta.toFixed(1);$('ft-tv').textContent=st.tau.toFixed(2);
    const d=data(),p={delta:st.delta,tau:st.tau};const posY=d.y.every(v=>v>0);
    const fits={},lines=[],rows=[];
    KEYS.forEach(k=>{if(!st.on[k])return;if(k==='mape'&&!posY){rows.push('<tr><td><span class="sw" style="background:'+COL[k]+'"></span>MAPE</td><td colspan="4" class="mute">not defined: a target is 0 or negative</td></tr>');return}
      const f=LF.fit(k,d.x,d.y,p);fits[k]=f;const xs=d.xr;lines.push({xs,ys:xs.map(x=>f.a+f.b*x),c:COL[k],w:k===st.insp?3:2,dash:k==='mape'?'6 3':k==='pinball'?'2 3':null});
      const nm=k==='huber'?'Huber, δ = '+$('ft-dv').textContent:k==='pinball'?'Pinball, τ = '+st.tau.toFixed(2):LF.REG[k].name;
      const note=f.i!=null?'passes through points at x = '+PL.fmt(d.x[f.i])+' and '+PL.fmt(d.x[f.j]):k==='mse'?'closed form':'IRLS to convergence';
      rows.push('<tr><td><span class="sw" style="background:'+COL[k]+'"></span>'+nm+'</td><td class="num">'+f.a.toFixed(3)+'</td><td class="num">'+f.b.toFixed(3)+'</td><td class="num">'+LF.objective(k,d.x,d.y,f,p).toPrecision(4)+'</td><td class="small mute">'+note+'</td></tr>')});
    const fi=fits[st.insp];
    let w=null;if(fi){const P=LF.pulls(st.insp,d.x,d.y,fi,p),mx=Math.max(...P.map(q=>Math.abs(q.psi)))||1;w=P.map(q=>0.25+0.75*Math.abs(q.psi)/mx)}
    const pts=d.x.map((x,i)=>({x,y:d.y[i],r:d.hl.includes(i)?5.5:4.2,c:d.hl.includes(i)?'var(--c2)':'var(--ink)',o:w?w[i]:0.8,stroke:d.hl.includes(i)?'var(--bg)':null,title:'('+PL.fmt(x)+', '+PL.fmt(d.y[i])+')'}));
    PL.chart({el:$('ft-svg'),id:'ft',x:d.xr,y:d.yr,lines,pts,onclick:click,xl:st.ds.startsWith('st')?'log surface temperature':'x',yl:st.ds.startsWith('st')?'log light':'y',h:RD.width($('ft-svg'))<420?250:300,label:'Fitted lines for each loss'});
    $('ft-note').textContent=(st.ds==='own'?'Tap empty space to add a point, tap a point to remove it. ':'Tap the chart to copy these points into "your points" and add one there. ')+'Point opacity: its share of the largest pull under '+LF.REG[st.insp].name+'.';
    $('ft-tbl').innerHTML='<tr><th>Loss</th><th class="num">intercept</th><th class="num">slope</th><th class="num">mean loss</th><th>how found</th></tr>'+rows.join('');
    // pulls and levers at the inspected fit
    if(fi){const P=LF.pulls(st.insp,d.x,d.y,fi,p),xb=LF.mean(d.x),ord=d.x.map((v,i)=>i).sort((i,j)=>d.x[i]-d.x[j]);
      const n=ord.length,segs=[],vals=[];ord.forEach((i,r)=>{const ps=P[i].psi,lv=ps*(d.x[i]-xb);vals.push(ps,lv);
        segs.push({x1:r-0.17,y1:0,x2:r-0.17,y2:ps,c:'var(--c3)',w:Math.max(2,Math.min(9,300/n))});segs.push({x1:r+0.17,y1:0,x2:r+0.17,y2:lv,c:d.hl.includes(i)?'var(--c2)':'var(--c4)',w:Math.max(2,Math.min(9,300/n))})});
      const yr=PL.ext(vals.concat([0]),0.1);
      PL.chart({el:$('ft-pull'),id:'ftp',nozx:true,x:[-0.8,n-0.2],y:yr,segs,xt:[],xl:'points in x order: pull (green), lever on the slope (purple; outliers orange)',h:170,label:'Pull and lever of each point'})}
    else $('ft-pull').innerHTML='';
  }
  fillInsp();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fit']=window.TAB_RENDER['t-fit']||[]).push(draw);
  addEventListener('resize',()=>{if(card.offsetParent)draw()});
})();
