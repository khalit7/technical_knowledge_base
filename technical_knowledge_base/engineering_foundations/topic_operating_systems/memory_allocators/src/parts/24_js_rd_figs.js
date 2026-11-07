// ---- Reading figure drawn at the measured width: pymalloc's arena, pools and blocks (section 7). Static: nothing moves.
// (The hero and glibc's lookup ladder became the 3D stages Fig. 1 and Fig. 3 on 2026-11-07: 34a_js_sc_hero.js, 34c_js_sc_bins.js.)
(function(){
  const $=id=>document.getElementById(id);if(!window.RD)return;
  const AK=window.AK||{};
  // wrap text to a width in px (approximate glyph width 0.56 em)
  const wrap=(s,px,fs)=>{const n=Math.max(6,Math.floor(px/(fs*0.56)));const out=[];let cur='';
    s.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
  const T=(x,y,s,o)=>RD.t(x,y,RD.esc(s),o);
  const box=(x,y,w,h,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o&&o.rx!=null?o.rx:6)+'" fill="'+(o&&o.fill||'var(--bg)')+'" stroke="'+(o&&o.stroke||'var(--line)')+'"'+(o&&o.sw?' stroke-width="'+o.sw+'"':'')+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>';
  const arrow=(x1,y1,x2,y2,col,dash)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="1.4"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
    (function(){const a=Math.atan2(y2-y1,x2-x1),L=6;return '<path d="M'+x2.toFixed(1)+' '+y2.toFixed(1)+' L'+(x2-L*Math.cos(a-0.45)).toFixed(1)+' '+(y2-L*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-L*Math.cos(a+0.45)).toFixed(1)+' '+(y2-L*Math.sin(a+0.45)).toFixed(1)+' Z" fill="'+col+'"/>'})();
  const hatch=id=>'<defs><pattern id="'+id+'" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--bg)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--c2)" stroke-width="1.6"/></pattern></defs>';

  // ---------- pymalloc levels ----------
  function pym(){const el=$('rd-pymd');if(!el)return;const W=RD.width(el),nar=W<560;let b=hatch('rd-pym-h');
    const cols=nar?16:32,rows=64/cols,cw=(W-2)/cols,ch=nar?18:20;
    b+=T(0,12,nar?'one arena: 1 MiB = 64 pools of 16 KiB':'one arena: 1 MiB = 64 pools of 16 KiB, each pool one size class',{fs:12,w:600,fill:'var(--ink)'});
    const live=new Set([5,22,41]);  // illustrative: three pools that still hold one live object
    for(let k=0;k<64;k++){const c=k%cols,r=Math.floor(k/cols),x=1+c*cw,y=20+r*(ch+3);
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(cw-3).toFixed(1)+'" height="'+ch+'" fill="url(#rd-pym-h)" stroke="var(--c2)" stroke-width=".8"/>';
      if(live.has(k))b+='<circle cx="'+(x+(cw-3)/2).toFixed(1)+'" cy="'+(y+ch/2)+'" r="4.5" fill="var(--c1)"/>'}
    let y=20+rows*(ch+3)+16;
    b+=T(0,y,'Blue dot: one live object. Its pool stays, so the whole arena stays mapped.',{fs:11,fill:'var(--mute)'});
    if(nar){b=b.replace(/<text[^>]*>Blue dot[^<]*<\/text>/,'');b+=T(0,y,'Blue dot: one live object; its pool stays,',{fs:11,fill:'var(--mute)'})+T(0,y+14,'so the whole arena stays mapped.',{fs:11,fill:'var(--mute)'});y+=14}
    y+=22;
    // one pool zoomed: blocks of 48 bytes (a one-element tuple)
    b+=T(0,y,nar?'one pool: equal blocks of one class':'one pool (16 KiB): equal blocks of one class, e.g. 48 B tuples',{fs:12,w:600,fill:'var(--ink)'});y+=8;
    const n=nar?24:48,bwid=(W-2)/n;for(let k=0;k<n;k++){const isLive=k===9;
      b+='<rect x="'+(1+k*bwid).toFixed(1)+'" y="'+y+'" width="'+(bwid-1.5).toFixed(1)+'" height="16" fill="'+(isLive?'var(--c1)':'url(#rd-pym-h)')+'" stroke="'+(isLive?'none':'var(--c2)')+'" stroke-width=".6"/>'}
    y+=30;b+=T(0,y,'Measured: 2,000 survivors of 2,000,000 tuples kept all '+(AK['pym.arenas']||'158')+' arenas ('+(AK['pym.kept']||'163.1')+' MiB).',{fs:11,fill:'var(--c2)',w:600});
    if(nar){b=b.replace(/<text[^>]*>Measured: 2,000[^<]*<\/text>/,'');b+=T(0,y,'Measured: 2,000 survivors of 2,000,000',{fs:11,fill:'var(--c2)',w:600})+T(0,y+14,'tuples kept all '+(AK['pym.arenas']||'158')+' arenas ('+(AK['pym.kept']||'163.1')+' MiB).',{fs:11,fill:'var(--c2)',w:600});y+=14}
    el.innerHTML=RD.svg(W,y+8,b,'pymalloc arena of 64 pools, three pinned by one live object each')}

  const all=()=>{pym()};
  all();RD.onRender(all);RD.onResize(all);
})();
