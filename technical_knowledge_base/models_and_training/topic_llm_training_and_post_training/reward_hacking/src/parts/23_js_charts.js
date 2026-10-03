// ---- Reading: static charts from published tables (Singhal Table 3, Zhang Table 2, PAR Table 1, MacDiarmid Fig. 9) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RHD)return;
  const seg=(el,opts,cur,on)=>{el.innerHTML=opts.map((o,i)=>'<button data-i="'+i+'" class="'+(i===cur?'on':'')+'">'+o+'</button>').join('');
    el.onclick=e=>{const b=e.target.closest('button[data-i]');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));on(+b.dataset.i)}};
  const bar=(name,val,max,txt,col,hl,sub,mark)=>'<div class="row'+(hl?' hl':'')+'"><span class="nm" title="'+RD.esc(name)+'">'+RD.esc(name)+(sub?'<span class="ml" style="display:block;font-size:11px;color:var(--mute)">'+sub+'</span>':'')+'</span><span class="track"><span class="fill" style="width:'+Math.max(0,Math.min(100,100*val/max)).toFixed(1)+'%;background:'+col+'"></span>'+(mark!=null?'<span style="position:absolute;left:'+mark+'%;top:0;bottom:0;border-left:1.5px dashed var(--ink);opacity:.6"></span>':'')+'</span><span class="val">'+txt+'</span></div>';

  // --- length against reward (Singhal et al. Table 3) ---
  if($('ln')){
    const S=RHD.SING,keys=Object.keys(S.rows);let cur=0;
    function draw(){
      const k=keys[cur],R=S.rows[k],box=$('lnSvg'),W=RD.width(box),H=Math.round(Math.min(260,Math.max(200,W*.4))),ml=44,mr=14,mt=12,mb=34;
      const L=R.map(r=>r[1]).concat([S.lppo[k][0]]),V=R.map(r=>r[2]);
      const x0=Math.min(...L)*0.85,x1=Math.max(...L)*1.08,v0=Math.min(...V),v1=Math.max(...V),pad=(v1-v0)*0.18;
      const x=v=>ml+(W-ml-mr)*(v-x0)/(x1-x0),y=v=>mt+(H-mt-mb)*((v1+pad)-v)/((v1+pad)-(v0-pad));
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Response length against reward for '+k+'">';
      const step=(v1-v0)>2?0.5:(v1-v0)>0.6?0.2:0.1;
      for(let v=Math.ceil((v0-pad)/step)*step;v<=v1+pad;v+=step)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(step<0.2?2:1)+'</text>';
      const ts=(x1-x0)>150?50:25;for(let t=Math.ceil(x0/ts)*ts;t<=x1;t+=ts)s+='<text x="'+x(t)+'" y="'+(H-18)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>';
      s+='<text x="'+(W-mr)+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">mean response length (tokens)</text>';
      s+='<text x="'+(ml+2)+'" y="'+(mt+6)+'" font-size="10" fill="var(--mute)">reward-model score</text>';
      const a=R[0],b=R[1];
      s+='<defs><marker id="lnA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--c2)"/></marker></defs>';
      s+='<line x1="'+x(a[1])+'" y1="'+y(a[2])+'" x2="'+x(b[1])+'" y2="'+y(b[2])+'" stroke="var(--c2)" stroke-width="2" marker-end="url(#lnA)"/>';
      const placed=R.map(r=>[x(r[1])-6,y(r[2])+4,12]);
      R.forEach((r,i)=>{const c=i===0?'var(--mute)':i===1?'var(--c2)':'var(--c1)';const lx=x(r[1]),ly=y(r[2]);
        s+='<circle cx="'+lx+'" cy="'+ly+'" r="5" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5"/>'});
      R.forEach((r,i)=>{const lx=x(r[1]),ly=y(r[2]),right=lx<W*0.62,w=r[0].length*6;let tx=lx+(right?8:-8),ty=ly-7;
        const x0=right?tx:tx-w;let k=0;while(k<8&&placed.some(p=>Math.abs(p[1]-ty)<12&&x0<p[0]+p[2]&&p[0]<x0+w)){ty+=13;k++}
        placed.push([x0,ty,w]);s+='<text x="'+tx+'" y="'+ty+'" font-size="11" text-anchor="'+(right?'start':'end')+'">'+r[0]+'</text>'});
      // length-only PPO: no reward (Table 2 gives length and preference only); marked on the axis
      const lp=S.lppo[k];const lpx=x(lp[0]);s+='<line x1="'+lpx+'" x2="'+lpx+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--c4)" stroke-width="1.2" stroke-dasharray="3 3"/><text x="'+(lpx+4)+'" y="'+(mt+20)+'" font-size="10" fill="var(--c4)">length-only PPO: '+lp[0]+' tokens</text>';
      box.innerHTML=s+'</svg>';
      const ratio=b[1]/a[1],nr=S.nrg[k];
      $('lnN').innerHTML=RD.stat('Length, SFT to PPO',a[1]+' → '+b[1],'×'+ratio.toFixed(2)+' <i class="nl d">derived</i>')+RD.stat('Reward, SFT to PPO',a[2]+' → '+b[2],'this dataset\'s own RM')+
        RD.stat('Share of reward gain not due to length',nr[2]+'%','Table 1, NRG / ΔR = '+nr[1]+' / '+nr[0])+RD.stat('Win rate against SFT','PPO '+S.ppo_pref[k]+'%','length-only PPO '+S.lppo[k][1]+'% (Table 2)');
    }
    seg($('lnS'),keys,0,i=>{cur=i;draw()});RD.onRender(draw);draw();
    let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  }

  // --- format bias (Zhang et al. Table 2) ---
  if($('fm')){
    const F=RHD.FMT;let c=0;
    function draw(){let h='';F.rows.forEach(r=>{const v=r[2][c];h+=bar(r[0],v,100,v+'%',v>=50?'var(--c2)':'var(--c1)',r[0]==='GPT-4 Turbo',r[1],50)});
      $('fmB').innerHTML=h}
    seg($('fmS'),F.cols,0,i=>{c=i;draw()});draw();
  }

  // --- PAR Table 1 ---
  if($('pa')){
    const P=RHD.PAR;let m=0;
    function draw(){const max=m?Math.max(...P.map(r=>r[2])):100;let h='';
      P.forEach(r=>{const v=m?r[2]:r[1];h+=bar(r[0],v,max,m?v.toLocaleString('en-US'):v.toFixed(v<1&&v>0?2:1)+'%',r[0]==='Vanilla PPO'?'var(--bad)':r[0].startsWith('SFT')?'var(--mute)':(r[1]>40?'var(--good)':'var(--c2)'),r[0]==='PAR')});
      $('paB').innerHTML=h}
    seg($('paS'),['Length-controlled win rate against SFT','Answer length'],0,i=>{m=i;draw()});draw();
  }

  // --- MacDiarmid et al. Fig. 9 ---
  if($('mg')){
    const E=[['Betley et al. questions',33.7,0.7,4.8,0.3],['Fake or bad goals',69.8,0.1,17.1,1.5],['Deceptive on alignment questions',39.9,0.3,9.0,0.2],['Monitor disruption',31.8,0.2,24.6,1.2],['Exfiltration offer (hackers)',1.6,0.0,0.4,0.0],['Frame a colleague',41.3,4.0,37.4,3.5]];
    let m=0;const wrap=$('mg');const s=document.createElement('div');s.className='seg';wrap.insertBefore(s,wrap.firstChild);
    function draw(){let h='';E.forEach(e=>{const a=m?e[3]:e[1],b=m?e[4]:e[2];
      h+=bar(e[0],a,70,a.toFixed(1)+'%','var(--bad)',true,'learned to hack');h+=bar('',b,70,b.toFixed(1)+'%','var(--mute)',false,'no hacking (baseline)')});
      $('mgB').innerHTML=h}
    seg(s,['Taught by documents (SDF)','Taught by prompt hints'],0,i=>{m=i;draw()});draw();
  }
})();
