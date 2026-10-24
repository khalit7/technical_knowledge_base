// ---- Reading tab: MSA kernel, Q-outer against KV-outer (diagram and intensity widget) ----
(function(){ // MSA kernel: Q-outer against KV-outer arithmetic intensity (paper eqs 13 to 16)
  if(!$('ki'))return;
  const BS=[32,64,128,256],GS=[4,8,16,32],HKV=4;
  function draw(){const Bk=BS[+$('kiB').value],G=GS[+$('kiG').value],H=G*HKV,k=SELT/Bk;
    $('kiBv').textContent=Bk+' tokens';$('kiGv').textContent=G+(G===16?' (M3)':'');
    const qo=(4*H*k*Bk)/(4*H+4*HKV*k*Bk),ko=(4*H*k*Bk)/(4*HKV+4*H*k+2*H*(k+1));
    $('kiOut').innerHTML=stat('Q outer, gather KV',qo.toFixed(1)+' FLOP per byte','about G = '+G)+stat('KV outer, gather Q',ko.toFixed(1)+' FLOP per byte','about ⅔ B<sub>k</sub> = '+(2*Bk/3).toFixed(1))+stat('KV-outer advantage',(ko/qo).toFixed(1)+'×',k+' blocks of '+Bk+' = 2,048 keys per group');
    $('kiCap').innerHTML='Same token budget throughout (2,048 selected keys per query and group, so <i>k</i> = 2,048 / <i>B<sub>k</sub></i>), '+H+' query heads over 4 KV heads, BF16 traffic. Defaults reproduce the paper\'s two approximations (about <i>G</i> and about ⅔ <i>B<sub>k</sub></i>) <b>independently</b> from its eqs. 13 to 16; the exact kernel also depends on scheduling and hot blocks, which this ignores.'}
  $('kiB').addEventListener('input',draw);$('kiG').addEventListener('input',draw);draw();
})();


(function(){ // kernel loop orders on one illustrative selection: Q outer loads a tile per (query, block) pair, KV outer once per block
  if(!$('kiSvg'))return;
  const SEL=[[0,2,5],[0,2,3],[0,3,5],[0,2,5]],NB=6,NQ=4,used=[0,2,3,5];
  const pairs=SEL.reduce((s,r)=>s+r.length,0);
  function draw(){const W=RD.width($('kiSvg'))||640,narrow=W<560,pw=narrow?W:(W-24)/2,cs=Math.max(24,Math.min(40,(pw-56)/NB)),gh=cs*NQ,top=40,ph=top+gh+34,H=narrow?ph*2+10:ph;
    let s='';
    const panel=(ox,oy,kv)=>{let p=RD.t(ox,oy+14,kv?'KV outer, gather Q: '+used.length+' tile loads':'Q outer, gather KV: '+pairs+' tile loads',{fs:12.5,w:600});
      const x0=ox+44,y0=oy+top;
      for(let b=0;b<NB;b++)p+=RD.t(x0+b*cs+cs/2,y0-6,'b'+(b+1),{a:'middle',fs:11,fill:'var(--mute)'});
      let n=0;const order={};if(kv)used.forEach((b,i)=>order[b]=i+1);
      for(let q=0;q<NQ;q++){p+=RD.t(ox+4,y0+q*cs+cs/2+4,'q'+(q+1),{fs:11.5,fill:'var(--mute)'});
        for(let b=0;b<NB;b++){const on=SEL[q].includes(b),x=x0+b*cs,y=y0+q*cs;
          p+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3" fill="'+(on?(kv?'var(--good)':'var(--acc)'):'var(--soft)')+'" opacity="'+(on?.85:1)+'" stroke="var(--line)"/>';
          if(on){n++;p+=RD.t(x+cs/2,y+cs/2+4,String(kv?order[b]:n),{a:'middle',fs:11.5,fill:'var(--bg)',w:600})}}}
      p+=RD.t(x0,y0+gh+18,kv?'number = the load that serves it':'number = load order',{fs:11,fill:'var(--mute)'});
      return p};
    s+=panel(0,0,false)+panel(narrow?0:pw+24,narrow?ph+10:0,true);
    $('kiSvg').innerHTML=RD.svg(W,H,s,'The same selected query and block pairs under the two kernel loop orders');
    $('kiDiag').innerHTML='Illustrative selection: 4 queries, 6 key blocks, 3 blocks each. Query outer fetches a block tile for every (query, block) pair, '+pairs+' loads; KV outer loads each selected block once and serves every query that chose it, '+used.length+' loads. Block 1 plays the sink that every query picks, which is where most of the reuse comes from.'}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
