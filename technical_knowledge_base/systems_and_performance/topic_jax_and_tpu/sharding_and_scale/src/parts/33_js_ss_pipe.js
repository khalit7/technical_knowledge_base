// ---- Pipeline tab (t-pipe): the real tick-by-tick schedules from src/runs/ss_pipe.py ----
(function(){
  const U=SSU,esc=U.esc,$=id=>document.getElementById(id),PP=SS.pipe;
  const refs={'pp-ref-vmap':'mt_pipe_vmap','pp-ref-rot':'mt_pipe_rotate','pp-ref-bub':'mt_bubble'};
  Object.entries(refs).forEach(e=>{$(e[0]).innerHTML=U.ref(e[1])});
  $('pi-mt').textContent=SS.source.refs.mt_bubble.text.replace(/^#\s*/,'');
  $('pi-code').textContent=SS.code.pipe.replace(/^    /gm,'');
  const runs=PP.runs.filter(r=>r.kind!=='gpipe_contiguous');
  const name=r=>(r.kind==='gpipe'?'GPipe':'Circular')+' S'+r.S+' M'+r.M+(r.R>1?' R'+r.R:'');
  $('pi-run').insertAdjacentHTML('beforeend',runs.map((r,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+name(r)+'</button>').join(''));
  let ri=0;
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--acc)','var(--bad)'];
  function draw(i){
    const r=runs[ri],S=r.S,T=r.ticks,sch=r.schedule,el=$('pi-svg'),W=U.width(el);
    const lab=62,cw=Math.min(54,(W-lab-6)/T),ch=34,H=S*ch+26;
    let s='';for(let t=0;t<T;t++)s+=RD.t(lab+t*cw+cw/2,12,'t'+t,{a:'middle',fs:10.5});
    let busy=0,idle=0;
    for(let st=0;st<S;st++){const y=18+st*ch;s+=RD.t(lab-6,y+ch/2+4,'stage '+st,{a:'end',fs:11});
      for(let t=0;t<T;t++){const c=sch[t][st],x=lab+t*cw,shown=t<i;
        if(shown){if(c)busy++;else idle++}
        const fill=!shown?'var(--bg)':c?COL[c[0]%COL.length]:'var(--dim)';
        s+='<rect x="'+(x+1)+'" y="'+(y+2)+'" width="'+(cw-2)+'" height="'+(ch-6)+'" rx="3" fill="'+fill+'" fill-opacity="'+(shown?(c?.75:.6):1)+'" stroke="'+(t===i-1?'var(--ink)':'var(--line)')+'"/>';
        if(shown&&c)s+=RD.t(x+cw/2,y+ch/2+3,'m'+c[0]+(r.R>1?' r'+c[1]:''),{a:'middle',fs:cw<34?9:10.5,fill:'var(--bg)',w:600});
        if(shown&&t===i-1&&t<T-1&&(st<S-1||r.R>1)){const y2=st<S-1?y+ch+ch/2:18+ch/2;
          s+='<line x1="'+(x+cw-4)+'" y1="'+(y+ch/2)+'" x2="'+(x+cw+6)+'" y2="'+(st<S-1?y2-ch/2+4:y2)+'" stroke="var(--ink)" stroke-width="1.2" marker-end="url(#pi-ar)"/>'}}}
    el.innerHTML=RD.svg(lab+T*cw+6,H,'<defs><marker id="pi-ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L6,3L0,6z" fill="var(--ink)"/></marker></defs>'+s,'Pipeline schedule');
    const lps=r.layers_per_stage_per_repeat;
    $('pi-desc').innerHTML='Mesh (stage '+r.S+', data '+(8/r.S)+'); stage s holds layers '+r.stage_layers.map((l,s)=>s+': ['+l.join(', ')+']').join('; ')+'. Each tick runs '+lps+' layer'+(lps>1?'s':'')+' per stage.';
    if(i===0)$('pi-cap').innerHTML='<b>Before the first tick.</b> Every device holds its stage\'s layers and its data shard\'s '+r.M+' microbatches; nothing has run.';
    else{const t=i-1,row=sch[t],act=row.map((c,s)=>c?'stage '+s+' runs m'+c[0]+(r.R>1?' (repeat '+c[1]+')':''):'stage '+s+' idle').join('; ');
      $('pi-cap').innerHTML='<b>Tick '+t+' of '+T+'.</b> '+act+'.'+(t<T-1?' Then every stage passes its output on with one <code>ppermute</code>.':' Last tick: the outputs go to every stage with a <code>psum</code>.')}
    const tot=S*Math.max(1,Math.min(i,T));
    $('pi-cnt').innerHTML=RD.stat('busy stage-ticks',busy+' of '+(S*i),'')+RD.stat('bubble so far',i?Math.round(idle/(S*i)*100)+'%':'0%','whole run: '+(r.bubble_fraction_forward*100).toFixed(1)+'%')+RD.stat('formula (S&minus;1)/(MR+S&minus;1)',(r.formula_bubble*100).toFixed(1)+'%','S='+r.S+', M='+r.M+', R='+r.R)+RD.stat('forward ppermutes so far',Math.max(0,Math.min(i,T-1)),'measured total, fwd+bwd: '+r.collectives['collective-permute'].count);
  }
  const an=U.anim({tab:'t-pipe',card:'pi-card',ctl:'pi-ctl',n:runs[0].ticks+1,draw,ms:1100,label:'Tick'});
  U.seg($('pi-run'),v=>{ri=+v;an.reset(runs[ri].ticks+1)});
  addEventListener('resize',()=>{const t=$('t-pipe');if(t&&!t.hidden)an.redraw()});
  const cs=c=>Object.keys(c).map(k=>U.chip(k,k+' x'+c[k].count+', '+U.MB(c[k].bytes))).join(' ');
  $('pi-t').querySelector('tbody').innerHTML=PP.runs.map(r=>'<tr><td>'+(r.kind==='gpipe_contiguous'?'GPipe, contiguous microbatches':r.kind==='gpipe'?'GPipe':'Circular')+'</td><td class="num">'+r.S+'</td><td class="num">'+r.M+'</td><td class="num">'+r.R+'</td><td>'+r.stage_layers.map(l=>'['+l.join(',')+']').join(' ')+'</td><td class="num">'+r.ticks+'</td><td class="num">'+(r.bubble_fraction_forward*100).toFixed(1)+'%</td><td>'+cs(r.collectives)+'</td><td class="num">'+U.sci(r.abs_loss_diff)+' / '+U.sci(r.grad_max_abs_diff)+'</td><td class="num">'+U.MB(r.temp_bytes_per_device)+'</td></tr>').join('');
  const bad=PP.runs.find(r=>r.kind==='gpipe_contiguous'),good=PP.runs.find(r=>r.kind==='gpipe'&&r.S===4&&r.M===4);
  $('pi-mist').innerHTML='The batch arrives split over <code>data</code> by rows: device 0 of the data axis holds rows 0 to 15. Cutting it into microbatches as <code>h.reshape(M, B // M, T, D)</code> makes microbatch m rows m&middot;8 to m&middot;8+7, which live on one data shard only, so the compiler must move them: '+cs(bad.collectives)+'. Taking microbatch m as rows m, m+M, m+2M, ... (<code>h.reshape(B // M, M, T, D).swapaxes(0, 1)</code>) keeps every row where it is: '+cs(good.collectives)+'. Same losses, same gradients; the all-to-all and the all-gather are pure waste.';
})();
