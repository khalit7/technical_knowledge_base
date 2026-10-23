// ---- Reading figures (2026-10-23): hero (slots on the call path), the custom-op table stepper (1.1),
// the cache trap (2.3) and what the compiler sees for three ways of plugging a kernel (4). All SVG, drawn at the measured width.
(function(){
  if(!document.getElementById('ext-hero'))return;
  const E=window.EXT,esc=RD.esc,$=id=>document.getElementById(id),T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="'+(o.r||6)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x,y1,y2)=>'<path d="M'+x+' '+y1+' V'+(y2-4)+'" stroke="var(--mute)" stroke-width="1.4"/><path d="M'+(x-4)+' '+(y2-6)+' L'+x+' '+y2+' L'+(x+4)+' '+(y2-6)+'" fill="none" stroke="var(--mute)" stroke-width="1.4"/>';

  // ---------- hero: one call path, five slots ----------
  const HERO=[
    ['plain','Your code','y = gelu(x);  out = F.linear(x, w)','',''],
    ['hook','Python API','the function you called','__torch_function__ · TorchFunctionMode','intercept Python calls on your type'],
    ['fact','Autograd key','records the backward node','register_autograd','fact 2: the gradient'],
    ['fact','ADInplaceOrView key','version counters and views','mutates_args in the schema','fact 3: what the op writes'],
    ['hook','Python key','hands the ATen operator to Python','__torch_dispatch__ · TorchDispatchMode','tensor subclasses, dispatch modes'],
    ['split']];
  const LAST=[['fact','Fake (Meta) kernel','used while compile and export trace','register_fake','fact 1: the output’s shape'],
              ['hook','Backend kernel','CPU · MPS · CUDA · PrivateUse1','register_kernel · TORCH_LIBRARY_IMPL','C++, Metal, Triton (triton_op), Helion']];
  function heroRow(r,x,y,w,h,wide){let b='';const k=r[0];
    b+=box(x,y,w,h,k==='fact'?{fill:'var(--acc2)',stroke:'var(--acc)',sw:2}:k==='hook'?{stroke:'var(--c4)',sw:1.5,dash:'5 3'}:{fill:'var(--soft)'});
    if(wide){const hx=x+w*0.47;
      b+=T(x+12,y+17,esc(r[1]),{fs:12.5,fill:'var(--ink)',w:600})+T(x+12,y+33,esc(r[2]),{fs:11,fill:'var(--mute)'});
      if(r[3])b+=T(hx,y+17,esc(r[3]),{fs:12,fill:k==='fact'?'var(--acc)':'var(--ink)',w:600})+T(hx,y+33,esc(r[4]),{fs:11,fill:k==='fact'?'var(--acc)':'var(--mute)'});
    }else{
      b+=T(x+10,y+16,esc(r[1]),{fs:12,fill:'var(--ink)',w:600})+T(x+10,y+31,esc(r[2]),{fs:11,fill:'var(--mute)'});
      if(r[3])b+=T(x+10,y+48,esc(r[3]),{fs:11.5,fill:k==='fact'?'var(--acc)':'var(--ink)',w:600})+T(x+10,y+63,esc(r[4]),{fs:11,fill:k==='fact'?'var(--acc)':'var(--mute)'});
    }return b}
  function hero(){const el=$('ext-hero'),W=RD.width(el),wide=W>=620,g=12;let y=2,b='';
    HERO.forEach((r,j)=>{
      if(r[0]==='split')return;
      const h=wide?42:(r[3]?70:38);
      b+=heroRow(r,1,y,W-2,h,wide);y+=h;b+=arrow(28,y,y+g);y+=g});
    if(wide){const gg=30,w=(W-2-gg)/2,h=70;
      LAST.forEach((r,j)=>{b+=heroRow(r,1+j*(w+gg),y,w,h,false)});
      b+=T(1+w+gg/2,y+h/2+4,'or',{fs:11,fill:'var(--mute)',a:'middle'});y+=h;
    }else{LAST.forEach((r,j)=>{const h=70;b+=heroRow(r,1,y,W-2,h,false);y+=h;if(j===0){b+=T(W/2,y+11,'or, when the call runs for real',{fs:11,fill:'var(--mute)',a:'middle'});y+=16}})}
    el.innerHTML=RD.svg(W,y+2,b,'The call path from your code through the Python API, the autograd, ADInplaceOrView and Python dispatch keys, to a fake or real kernel, with the extension point at each slot')}
  hero();RD.onRender(hero);RD.onResize(hero);

  // ---------- 1.1: the operator's table, one registration at a time ----------
  if($('ext-tbl-card')){
    const VAR=['kernel_only','kernel_fake','full'];
    const STEP=[
      ['@custom_op("ext::gelu", mutates_args=())','The decorator defines the operator and registers your function as its kernel for every device. It also registers a fake slot and an autograd slot that raise. Eager forward runs; eager backward and torch.compile both stop.'],
      ['+ gelu.register_fake','The fake fills the Meta slot: given input shapes it returns an empty output of the right shape. Dynamo can now trace the op as one node, but AOTAutograd cannot build the backward graph.'],
      ['+ gelu.register_autograd','The formula fills the Autograd slot. Eager and compiled training both work, every parameter gets a gradient, and opcheck passes all four tests.']];
    function slots(i){return [
      ['CompositeExplicitAutograd','gelu: your kernel, every device','on'],
      ['Meta (the fake)',i>=1?'torch.empty_like(x)':'raises: no fake registered',i>=1?'new':'bad'],
      ['Autograd',i>=2?'setup_context + backward':'raises at backward',i>=2?'new':'bad'],
      ['ADInplaceOrView','none: mutates_args=()','dim']]}
    function results(i){const v=E.variants[VAR[i]];const oc=Object.values(v.opcheck||{});const np=oc.filter(o=>o&&o.ok).length;
      return [['eager forward',true,'loss '+v.loss],
        ['eager backward',!v.eager_err,v.eager_err?'no autograd formula':v.with_grad+' of '+v.n_params+' parameters'],
        ['torch.compile trace',v.graphs!=null,v.graphs!=null?v.graphs+' graph, '+v.breaks+' breaks':'stops: no fake'],
        ['compiled training',!!(v.comp_ok&&v.comp_grad_diff<1e-3),v.comp_ok?'gradients match eager':v.graphs==null?'fails: no fake':'fails building backward'],
        ['opcheck',np===oc.length,np+' of '+oc.length+' tests pass']]}
    function draw(i){const el=$('ext-tbl-view'),W=RD.width(el),wide=W>=640;let b='',y=2;
      const tw=wide?W*0.56:W-2,rh=wide?32:42;
      b+=T(1,13,'The operator’s slots',{fs:11,fill:'var(--mute)'});y=20;
      slots(i).forEach(s=>{const st=s[2];
        b+=box(1,y,tw,rh-4,{fill:st==='new'?'var(--acc2)':'var(--bg)',stroke:st==='new'?'var(--acc)':st==='bad'?'var(--bad)':'var(--line)',sw:st==='new'?2:1,op:st==='dim'?0.55:1});
        if(wide){b+=T(9,y+18,esc(s[0]),{fs:11.5,fill:'var(--mute)'})+T(9+tw*0.46,y+18,esc(s[1]),{fs:11.5,fill:st==='bad'?'var(--bad)':'var(--ink)',w:st==='new'?600:400})}
        else{b+=T(9,y+15,esc(s[0]),{fs:11,fill:'var(--mute)'})+T(9,y+31,esc(s[1]),{fs:11.5,fill:st==='bad'?'var(--bad)':'var(--ink)',w:st==='new'?600:400})}
        y+=rh});
      let rx=1,ry=20;if(wide){rx=tw+18}else{ry=y+10;b+=T(1,ry-1,'What works now',{fs:11,fill:'var(--mute)'});ry+=7}
      if(wide)b+=T(rx,13,'What works now (recorded)',{fs:11,fill:'var(--mute)'});
      results(i).forEach(r=>{const c=r[1]?'var(--good)':'var(--bad)';
        b+='<circle cx="'+(rx+7)+'" cy="'+(ry+9)+'" r="6" fill="'+c+'"/>'+T(rx+7,ry+13,r[1]?'✓':'✗',{fs:10,fill:'var(--bg)',a:'middle',w:700});
        b+=T(rx+19,ry+13,esc(r[0])+':',{fs:11.5,fill:'var(--ink)',w:600})+T(rx+19+(wide?122:122),ry+13,esc(r[2]),{fs:11.5,fill:c});ry+=24});
      el.innerHTML=RD.svg(W,Math.max(y,ry)+4,b,'dispatch slots of ext::gelu and what works');
      $('ext-tbl-cap').innerHTML='<div class="t">Step '+(i+1)+' of 3: <code>'+esc(STEP[i][0])+'</code></div><p>'+STEP[i][1]+'</p>'}
    const an=RD.anim({card:'ext-tbl-card',ctl:'ext-tbl-ctl',n:3,draw,ms:2200,label:'Registration step'});
    RD.onResize(()=>an.redraw());
  }

  // ---------- 2.3: four processes, one cache ----------
  if($('ext-trap-svg')){
    const LBL=['registers after a first trace','registers at import','at import; AOTAutograd cache off','at import; all caches off'];
    const ACT=['writes the broken backward','reads it: cache hit','bypasses the AOTAutograd cache','bypasses every cache'];
    function trap(){const el=$('ext-trap-svg'),W=RD.width(el),wide=W>=600,cx=W-16;let b='',y=2;
      b+=box(1,y,W-2,30,{fill:'var(--soft)',stroke:'var(--c5)',sw:1.5})+T(10,y+19,wide?'Shared compile cache on disk (FX graph cache + AOTAutograd cache)':'Shared compile cache on disk',{fs:wide?12:11.5,fill:'var(--ink)',w:600});
      y+=44;
      E.trap.forEach((r,j)=>{const bad=r.no_grad_params>0,h=wide?40:54;const w=W-40;
        b+=box(1,y,w,h,{stroke:bad?'var(--bad)':'var(--good)',sw:1.5});
        b+=T(9,y+16,'Process '+(j+1)+': '+esc(LBL[j]),{fs:wide?12:11.5,fill:'var(--ink)',w:600});
        const res=r.no_grad_params+' of '+r.params+' parameters get no gradient';
        if(wide)b+=T(9,y+32,esc(ACT[j]),{fs:11,fill:'var(--mute)'})+T(w-6,y+32,res,{fs:11.5,fill:bad?'var(--bad)':'var(--good)',a:'end',w:600});
        else b+=T(9,y+31,esc(ACT[j]),{fs:11,fill:'var(--mute)'})+T(9,y+47,res,{fs:11.5,fill:bad?'var(--bad)':'var(--good)',w:600});
        // connector to the cache band
        const my=y+h/2,lx=j===0?W-10:W-26;
        if(j===0)b+='<path d="M'+(w+1)+' '+my+' H'+lx+' V34" fill="none" stroke="var(--bad)" stroke-width="2"/><path d="M'+(lx-4)+' 41 L'+lx+' 34 L'+(lx+4)+' 41" fill="none" stroke="var(--bad)" stroke-width="2"/>';
        if(j===1)b+='<path d="M'+lx+' 34 V'+my+' H'+(w+1)+'" fill="none" stroke="var(--c5)" stroke-width="2"/><path d="M'+(w+8)+' '+(my-4)+' L'+(w+2)+' '+my+' L'+(w+8)+' '+(my+4)+'" fill="none" stroke="var(--c5)" stroke-width="2"/>';
        y+=h+10});
      el.innerHTML=RD.svg(W,y,b,'four processes sharing one compile cache')}
    trap();RD.onRender(trap);RD.onResize(trap);
  }

  // ---------- 4: what the compiler sees ----------
  if($('ext-plug-svg')){
    const P=[['custom_op around a kernel','ext::gelu','solid','Opaque: Inductor calls it,','checks metadata, fuses nothing'],
             ['triton_op + wrap_triton','triton kernel','open','Visible: decomposed into its','launches; Inductor sees kernels'],
             ['Helion kernel','helion HOP','hop','Traced call: a higher-order op;','1 graph, 0 breaks on MPS']];
    function plug(){const el=$('ext-plug-svg'),W=RD.width(el),wide=W>=640,g=10;let b='';
      const pw=wide?(W-2*g)/3:W-2,ph=104;
      P.forEach((p,j)=>{const x=wide?j*(pw+g):1,y=wide?2:2+j*(ph+g);
        b+=box(x+0.5,y,pw-1,ph,{fill:'var(--bg)'});
        b+=T(x+10,y+17,esc(p[0]),{fs:12,fill:'var(--ink)',w:600});
        const bw=Math.min(64,(pw-40)/3.4),mid=pw-24-2*bw-16,by=y+30,bh=28;
        const x1=x+10,x2=x1+bw+8,x3=x2+mid+8;
        b+=box(x1,by,bw,bh,{fill:'var(--soft)'})+T(x1+bw/2,by+18,'fc',{fs:11,fill:'var(--ink)',a:'middle'});
        b+=box(x3,by,bw,bh,{fill:'var(--soft)'})+T(x3+bw/2,by+18,'proj',{fs:11,fill:'var(--ink)',a:'middle'});
        if(p[2]==='solid')b+=box(x2,by,mid,bh,{fill:'var(--ink)',stroke:'var(--ink)'})+T(x2+mid/2,by+18,p[1],{fs:11,fill:'var(--bg)',a:'middle',w:600});
        else if(p[2]==='open')b+=box(x2,by,mid,bh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5,dash:'4 3'})+T(x2+mid/2,by+18,p[1],{fs:11,fill:'var(--ink)',a:'middle',w:600});
        else b+=box(x2,by,mid,bh,{fill:'var(--soft)',stroke:'var(--c4)',sw:1.5})+T(x2+mid/2,by+18,p[1],{fs:11,fill:'var(--ink)',a:'middle',w:600});
        b+='<path d="M'+(x1+bw)+' '+(by+14)+' H'+x2+' M'+(x2+mid)+' '+(by+14)+' H'+x3+'" stroke="var(--mute)"/>';
        b+=T(x+10,y+78,esc(p[3]),{fs:11,fill:'var(--ink)'})+T(x+10,y+93,esc(p[4]),{fs:11,fill:'var(--mute)'})});
      el.innerHTML=RD.svg(W,wide?ph+4:3*(ph+g),b,'custom_op, triton_op and Helion as the compiler sees them')}
    plug();RD.onRender(plug);RD.onResize(plug);
  }
})();
