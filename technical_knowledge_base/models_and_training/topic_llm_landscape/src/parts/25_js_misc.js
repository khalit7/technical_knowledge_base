// ---- Fig. 2, where the thinking goes: one schematic per design, stepped by RD.anim (plays once in view; stops on any control) ----
(function(){
  const $=id=>document.getElementById(id);
  // the four designs, one step each; what each step shows is written out in the step list (sx-th) beside the figure
  const ORD=['router','effort','branch','loop'];
  const box=(x,y,w,h,t,cls)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(cls||'var(--soft)')+'" stroke="var(--line)"/><text x="'+(x+w/2)+'" y="'+(y+h/2+5)+'" font-size="13" text-anchor="middle">'+t+'</text>';
  const arr=(x1,y1,x2,y2,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#ah)"'+(d?' stroke-dasharray="4 3"':'')+'/>';
  const tok=(x,y,n,col,label)=>{let s='';for(let i=0;i<n;i++)s+='<rect x="'+(x+i*15)+'" y="'+y+'" width="11" height="11" rx="2" fill="'+col+'"/>';return s+(label?'<text x="'+x+'" y="'+(y+26)+'" font-size="11.5" fill="var(--mute)">'+label+'</text>':'')};
  function svg(m){
    let s='<svg viewBox="0 0 640 190" role="img" aria-label="Schematic"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    s+=box(10,75,90,40,'Request');s+=box(540,75,90,40,'Answer','var(--acc2)');
    if(m==='router'){s+='<polygon points="160,95 195,70 230,95 195,120" fill="var(--soft)" stroke="var(--line)"/><text x="195" y="100" font-size="12" text-anchor="middle">router</text>';s+=arr(100,95,158,95);s+=arr(195,70,420,40);s+=arr(195,120,420,150);s+=box(330,20,180,36,'answer at once');s+=box(330,132,180,36,'reason first');s+=tok(345,108,8,'var(--dim)','reasoning, not returned');s+=arr(510,38,540,85);s+=arr(510,150,540,105)}
    if(m==='effort'){s+=box(150,75,150,40,'Claude');s+='<text x="225" y="40" font-size="12" text-anchor="middle" fill="var(--acc)">caller sets effort</text>'+arr(225,46,225,73);s+=arr(100,95,148,95);s+=tok(320,88,10,'var(--c5)','thinking tokens: billed, returned as summary or empty');s+=arr(470,95,538,95)}
    if(m==='branch'){s+=arr(100,95,140,95);[35,75,115,155].forEach((y,i)=>{s+=arr(140,95,190,y+5);s+=tok(195,y,8,'var(--c5)','');s+=arr(320,y+5,380,95)});s+=box(380,75,110,40,'select');s+=arr(490,95,538,95);s+='<text x="255" y="185" font-size="11.5" text-anchor="middle" fill="var(--mute)">parallel branches</text>'}
    if(m==='loop'){s+=box(200,60,170,70,'');for(let i=0;i<4;i++)s+='<rect x="'+(212+i*38)+'" y="72" width="30" height="46" rx="3" fill="var(--acc2)"/>';s+='<text x="285" y="150" font-size="11.5" text-anchor="middle" fill="var(--mute)">layers, looped: no tokens emitted</text>';s+='<path d="M360,60 C410,10 160,10 210,60" fill="none" stroke="var(--bad)" stroke-width="2" marker-end="url(#ah)"/><text x="285" y="22" font-size="12" text-anchor="middle" fill="var(--bad)">recurrent state</text>';s+=arr(100,95,198,95);s+=arr(370,95,538,95)}
    return s+'</svg>';
  }
  if(!$('thCard'))return;
  RD.anim({card:'thCard',ctl:'thCtl',n:ORD.length,ms:5200,label:'Design',list:'sx-th',draw:i=>{$('thSvg').innerHTML=svg(ORD[i])}});
})();
// ---- Nav highlight ----
(function(){
  const links=[...document.querySelectorAll('#nav a')];
  function on(){let cur=links[0];for(const a of links){const s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a}links.forEach(a=>a.classList.toggle('cur',a===cur))}
  addEventListener('scroll',on,{passive:true});on();
})();
