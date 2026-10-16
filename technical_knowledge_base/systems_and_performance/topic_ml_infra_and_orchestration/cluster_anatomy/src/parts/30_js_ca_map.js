// ---- Cluster explorer tab ----
(function(){const CA=window.CA,esc=RD.esc,$=id=>document.getElementById(id);if(!$('cm-svg'))return;
  const fmt=(v,d)=>v==null?'n/a':(+v).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const IDS=['superpod','nvl72','llama3','ff2'];let dz='llama3',li=4;
  $('cm-design').innerHTML=IDS.map(k=>'<button data-m="'+k+'"'+(k===dz?' class="on"':'')+'>'+esc(CA.levels[k].nm)+'</button>').join('');
  RD.seg($('cm-design'),m=>{dz=m;li=CA.levels[dz].lv.length-1;draw()});
  const lo=0,hi=Math.log10(9000);
  function draw(){const D=CA.levels[dz],L=D.lv;li=Math.min(li,L.length-1);const r=L[li];
    $('cm-crumb').innerHTML=L.slice(0,li+1).map((x,i)=>i===li?'<b>'+esc(x.nm)+'</b>':'<a data-i="'+i+'">'+esc(x.nm)+'</a>').reverse().join(' &larr; ')+' <span class="mute">(click a level name to go back down the list, or a box below)</span>';
    $('cm-crumb').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{li=+a.dataset.i;draw()}));
    // drawing: children of this level
    const box=$('cm-svg');const W=Math.max(300,Math.min(860,box.clientWidth||RD.width(box)));
    let s='';
    if(li===0){s+='<rect x="'+(W/2-60)+'" y="10" width="120" height="70" rx="6" fill="var(--open2)" stroke="var(--line)"/>'+RD.t(W/2,42,'one GPU',{a:'middle',fs:13,w:600})+RD.t(W/2,60,esc(r.via),{a:'middle',fs:10.5,fill:'var(--mute)'});
      box.innerHTML=RD.svg(W,92,s,'One GPU');}
    else{const c=L[li-1];const k=Math.round(r.n/c.n);const show=Math.min(k,64);const cols=Math.max(1,Math.min(show,Math.floor((W-16)/(W<520?40:56))));
      const cw=(W-16)/cols,ch=W<520?30:36,rows=Math.ceil(show/cols);
      for(let i=0;i<show;i++){const x=8+(i%cols)*cw,y=24+Math.floor(i/cols)*(ch+6);
        s+='<g class="cm-ch" style="cursor:pointer"><rect x="'+(x+2).toFixed(1)+'" y="'+y+'" width="'+(cw-4).toFixed(1)+'" height="'+ch+'" rx="4" fill="'+(li-1===0?'var(--open2)':'var(--soft)')+'" stroke="var(--line)"/>'+(cw>34?RD.t((x+cw/2).toFixed(1),y+ch/2+4,c.n>1?fmt(c.n,0):'GPU',{a:'middle',fs:10}):'')+'</g>'}
      const H=24+rows*(ch+6)+(k>show?18:4);
      s=RD.t(8,15,esc(r.nm)+' = '+fmt(k,0)+' x '+esc(c.nm.toLowerCase()),{fs:W<520?11:12,w:600})+s;
      if(k>show)s+=RD.t(8,H-4,'... '+fmt(k-show,0)+' more not drawn',{fs:11,fill:'var(--mute)'});
      if(k*c.n!==r.n)s+=RD.t(8,H+10,'('+fmt(k)+' x '+fmt(c.n,0)+' = '+fmt(k*c.n,0)+' drawn; the source states '+fmt(r.n,0)+')',{fs:10.5,fill:'var(--mute)'});
      const H2=H+(k*c.n!==r.n?16:0);
      box.innerHTML=RD.svg(W,H2,s,esc(r.nm)+' made of '+esc(c.nm));
      box.querySelectorAll('.cm-ch').forEach(g=>g.addEventListener('click',()=>{li=li-1;draw()}));}
    $('cm-det').innerHTML='<b>'+esc(r.nm)+'</b>: '+fmt(r.n,0)+' GPU'+(r.n>1?'s':'')+'. Reaching another GPU at this distance: '+esc(r.via)+(r.bw!=null?', <b>'+fmt(r.bw,r.bw<10?2:0)+' GB/s</b> each way per GPU':'')+(r.sw!=null&&li>0?'; network switches crossed: '+r.sw:'')+'. '+esc((r.note||'').replace(/^./,m=>m.toUpperCase()))+' <a href="'+r.src+'" target="_blank" rel="noopener noreferrer">source</a> <span class="lb '+D.label+'">'+D.label+'</span>';
    $('cm-lv').innerHTML=L.map((x,i)=>{const w=x.bw?Math.max(3,100*(Math.log10(x.bw)-lo)/(hi-lo)):0;
      return '<button data-i="'+i+'"'+(i===li?' class="on"':'')+'><span><b>'+esc(x.nm)+'</b><i>'+fmt(x.n,0)+' GPU'+(x.n>1?'s':'')+'</i></span><span><span class="cm-tr"><span class="cm-fi" style="width:'+w.toFixed(1)+'%"></span></span><i>'+esc(x.via)+'</i></span><span class="cm-v">'+(x.bw!=null?fmt(x.bw,x.bw<10?2:0)+' GB/s':'not stated')+'</span></button>'}).join('');
    $('cm-lv').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{li=+b.dataset.i;draw()}));
  }
  // comparison table
  (function(){const K=[['gpu','Own memory'],['node','Same node / tray'],['rack','Same rack'],['pod','Same pod / unit / zone'],['cluster','Anywhere in the cluster']];
    let h='<thead><tr><th>Distance</th>'+IDS.map(k=>'<th class="num">'+esc(CA.levels[k].nm)+'</th>').join('')+'</tr></thead><tbody>';
    K.forEach(kk=>{h+='<tr><td>'+kk[1]+'</td>'+IDS.map(id=>{const r=CA.levels[id].lv.find(x=>x.k===kk[0]);return '<td class="num">'+(r?(r.bw!=null?fmt(r.bw,r.bw<10?2:0)+'<br><span class="small mute">'+fmt(r.n,0)+' GPU'+(r.n>1?'s':'')+'</span>':'not stated'):'<span class="mute">no such level</span>')+'</td>'}).join('')+'</tr>'});
    $('cm-cmp').innerHTML=h+'</tbody>';})();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-camap']=[draw];
  addEventListener('resize',()=>{if(!$('t-camap').hidden)draw()});
  draw();
})();
