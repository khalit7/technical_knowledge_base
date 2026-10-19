// ---- Reading: the same batches at a too-high learning rate, without and with a fix (before/after animation) ----
(function(){
  const D=window.NSD,C=window.NSC,$=id=>document.getElementById(id);
  if(!D||!C||!window.RD||!$('sp-card'))return;
  const S=D.spike,A=D.runs[S.base];let B=D.runs[S.comps[S.def]],cmp=S.def;
  const FR=S.frames;           // probe indices shown, every S.every steps
  const lyr=A.pl.ml[0].length;
  function panel(R,fi,title,col){
    const k=Math.min(fi,R.pl.ml.length-1),ml=R.pl.ml[k],en=R.pl.ent[k],step=R.pl.step[k];
    const w=C.W($('sp-a'));const mx=5;           // bar axis: log10 of the logit, 0 to 5 (1 to 100,000)
    let h='<div class="small"><b style="color:'+col+'">'+C.esc(title)+'</b> <span class="mute">step '+step+(R.status==='diverged'&&k===R.pl.ml.length-1?' (diverged)':'')+'</span></div><div class="bars">';
    for(let l=0;l<lyr;l++){const v=ml[l],f=Math.max(0,Math.min(1,Math.log10(Math.max(v,1))/mx));
      h+='<div class="row"><span class="nm">layer '+(l+1)+'</span><span class="track"><span class="fill" style="width:'+(f*100).toFixed(1)+'%;background:'+col+'"></span></span><span class="val">'+C.fmt(v)+'</span></div>'}
    h+='</div><div class="small mute">entropy per layer (nats; uniform attention would give '+S.uniform_ent+'): '+en.map(e=>e.toFixed(2)).join(' &middot; ')+'</div>';
    return h}
  function draw(f){
    const fi=FR[f],step=A.pl.step[Math.min(fi,A.pl.step.length-1)];
    $('sp-a').innerHTML=panel(A,fi,A.label,'var(--c2)');
    $('sp-b').innerHTML=panel(B,fi,B.label,'var(--c1)');
    const ser=(k,lo)=>[{name:A.label,color:'var(--c2)',pts:A[k]},{name:B.label,color:'var(--c1)',pts:B[k]}];
    C.line($('sp-loss'),ser('l10'),{xmax:1500,ymin:1.8,ymax:8.5,vx:step,xl:'step',yl:'training loss',hline:[{y:D.grid.unigram,label:'unigram floor'}],h:180,label:'training loss'});
    C.line($('sp-ml'),ser('ml'),{xmax:1500,log:true,ymin:1,ymax:1e5,vx:step,xl:'step',yl:'largest attention logit (log)',h:180,label:'largest attention logit'});
    const at=(R,k)=>{const a=R[k].filter(p=>p[0]<=step).pop();return a?a[1]:null};
    $('sp-cnt').innerHTML=[['step',step,''],['training loss',C.fmt(at(A,'l10'),2)+' / '+C.fmt(at(B,'l10'),2),'without / with'],['largest logit',C.fmt(at(A,'ml'))+' / '+C.fmt(at(B,'ml')),'any layer'],['lowest layer entropy',C.fmt(at(A,'ent'),2)+' / '+C.fmt(at(B,'ent'),2),'nats'],['gradient norm',C.fmt(at(A,'gn'))+' / '+C.fmt(at(B,'gn')),'no clipping']].map(x=>RD.stat(x[0],x[1],x[2])).join('');
    const caps=S.caps[cmp];let c='';for(const k of caps){if(step>=k[0])c=k[1]}
    $('sp-cap').innerHTML='<p>'+c+'</p>';
  }
  const an=RD.anim({card:'sp-card',ctl:'sp-ctl',n:FR.length,ms:500,draw,label:'Training step'});
  RD.seg($('sp-cmp'),m=>{cmp=m;B=D.runs[S.comps[m]];an.reset(FR.length)});
  RD.onResize(()=>an.redraw());
})();
