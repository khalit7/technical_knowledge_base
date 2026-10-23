// ---- Reading section 4: tiling stepper and MXU padding card (moved from the old Tiles and padding tab, 2026-10-23) ----
(function(){
  const U=window.TQU,D=U.D,$=id=>document.getElementById(id),E=RD.esc;
  // presets: the Reading tab's arrays (recompute.json) plus two extra
  const PRE=D.rc.tiles.map(t=>[t[0],t[1],t[2]]).concat([['Llama 2 7B q weight [4096, 4096]',4096,4096],['one KV-cache page [16 tokens, 128]',16,128]]);
  $('tq-t-pre').innerHTML=PRE.map((p,i)=>'<option value="'+i+'">'+E(p[0])+'</option>').join('')+'<option value="-1">custom</option>';
  $('tq-t-pre').addEventListener('change',e=>{const i=+e.target.value;if(i>=0){$('tq-t-r').value=PRE[i][1];$('tq-t-c').value=PRE[i][2]}an.reset(6)});
  ['tq-t-r','tq-t-c','tq-t-dt'].forEach(id=>$(id).addEventListener('input',()=>{if(id!=='tq-t-dt')$('tq-t-pre').value='-1';an.redraw()}));
  const CAP=['<b>Before: the logical array.</b> A row-major array, the PyTorch and NumPy picture: element (i, j) sits at offset i x cols + j, so memory runs along each row in turn (the arrow).',
    '<b>Cut into tiles.</b> XLA covers the array with tiles of 8 rows x 128 columns, the shape of a TPU vector register (2 or 4 rows instead of 8 when the array has only that many). Tiles never straddle the array\'s edge: they extend past it.',
    '<b>Padding.</b> Everything a tile covers outside the array (hatched) is stored and moved anyway. A minor dimension of 65 pays for 128.',
    '<b>After: tile order in memory.</b> Memory now runs tile by tile: tile 0 holds rows 0 to 7 of columns 0 to 127, tile 1 the next 128 columns, and so on along the row of tiles, then the next row of tiles. Neighbouring elements of one column, 8 rows apart, are now close.',
    '<b>Inside a tile: packing.</b> TPUs work on 32-bit words. For bf16 the second level of tiling, (2,1), puts element (2r, c) and (2r+1, c) in one word; for int8, (4,1) puts four rows in one word; float32 needs none. The zoom shows one tile\'s first 8 rows and 16 columns, one box per word.',
    '<b>The bill.</b> Bytes stored against bytes the array needs. Moving this array to or from HBM costs the stored bytes, so the padding factor multiplies every memory-bound operation that touches it.'];
  function draw(i){
    const R=Math.max(1,+$('tq-t-r').value||1),C=Math.max(1,+$('tq-t-c').value||1),bpe=+$('tq-t-dt').value,h=U.hbmTile(R,C),tr=h.t,tilesR=h.rows/tr,tilesC=h.cols/128;
    const host=$('tq-t-svg'),W=Math.min(760,U.width(host)),zoom=i>=4,boxW=zoom?Math.min(W*0.46,320):W-24,maxH=zoom?220:260;
    // scale the padded extent into the box, keep aspect when sensible, at least 3 px per tile
    let sx=boxW/h.cols,sy=maxH/h.rows;let s=Math.min(sx,sy);const tooThin=h.cols*s<60||h.rows*s<30;if(tooThin){sx=boxW/h.cols;sy=Math.min(maxH/h.rows,Math.max(sy,30/h.rows))}else{sx=sy=s}
    const pw=h.cols*sx,ph=h.rows*sy,x0=12,y0=24;let g='<defs><pattern id="tq-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--mute)" stroke-width="1.4"/></pattern></defs>';
    g+=U.tx(x0,14,'['+R+', '+C+'] '+({4:'float32',2:'bf16',1:'int8'})[bpe]+(i>=1?' in '+tr+' x 128 tiles':''),{fs:11,w:600});
    if(i>=2)g+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" fill="url(#tq-hatch)" opacity=".55"/>';
    g+='<rect x="'+x0+'" y="'+y0+'" width="'+(C*sx)+'" height="'+(R*sy)+'" fill="var(--acc2)" stroke="var(--acc)"/>';
    if(i===0){const yy=y0+Math.min(R*sy,40)/2;g+='<line x1="'+(x0+4)+'" y1="'+yy+'" x2="'+(x0+C*sx-6)+'" y2="'+yy+'" stroke="var(--ink)" stroke-width="1.5" marker-end="url(#tq-arr)"/><defs><marker id="tq-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker></defs>'}
    if(i>=1){const gridOK=tilesC<=96&&tilesR<=160;if(gridOK){for(let a=0;a<=tilesC;a++)g+='<line x1="'+(x0+a*128*sx)+'" x2="'+(x0+a*128*sx)+'" y1="'+y0+'" y2="'+(y0+ph)+'" stroke="var(--c2)" stroke-width="'+(tilesC>40?0.5:1)+'"/>';
        for(let b=0;b<=tilesR;b++)g+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+(y0+b*tr*sy)+'" y2="'+(y0+b*tr*sy)+'" stroke="var(--c2)" stroke-width="'+(tilesR>40?0.4:1)+'"/>'}
      else g+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="var(--c2)"/>'+U.tx(x0+4,y0+ph+14,U.fmt(tilesR*tilesC)+' tiles: too many to draw one by one',{fs:10,fill:'var(--mute)'})}
    if(i===3){let k=0;for(let b=0;b<tilesR&&k<12;b++)for(let a=0;a<tilesC&&k<12;a++,k++){const cx=x0+(a+.5)*128*sx,cy=y0+(b+.5)*tr*sy;if(128*sx>14&&tr*sy>11)g+=U.tx(cx,cy+4,String(k),{a:'middle',fs:10,w:600,fill:'var(--c2)'})}}
    if(zoom){const zx=x0+boxW+24,zy=y0,cw=Math.min(16,(W-zx-8)/16),chh=Math.min(22,cw*1.3);const rowsPerWord=4/bpe;
      g+=U.tx(zx,14,'tile 0, rows 0 to 7, columns 0 to 15',{fs:10.5,fill:'var(--mute)'});
      for(let r=0;r<8;r++)for(let c=0;c<16;c++){const real=r<R&&c<C;g+='<rect x="'+(zx+c*cw)+'" y="'+(zy+r*chh)+'" width="'+(cw-1)+'" height="'+(chh-1)+'" fill="'+(real?'var(--acc2)':'var(--soft)')+'"'+(real?'':' stroke="var(--line)"')+'/>'}
      for(let r=0;r<8;r+=rowsPerWord)for(let c=0;c<16;c++)g+='<rect x="'+(zx+c*cw-0.5)+'" y="'+(zy+r*chh-0.5)+'" width="'+cw+'" height="'+(chh*rowsPerWord)+'" fill="none" stroke="var(--c4)" stroke-width="1.3" rx="2"/>';
      g+=U.tx(zx,zy+8*chh+14,rowsPerWord===1?'one 32-bit word per element':rowsPerWord+' rows share each 32-bit word',{fs:10.5,fill:'var(--c4)'})}
    const Hh=Math.max(y0+ph,zoom?y0+8*22:0)+30;host.innerHTML=U.S(W,Hh,g,'Tiled layout of the array');
    $('tq-t-cap').innerHTML='<b>Step '+(i+1)+' of 6.</b> '+CAP[i];
    const need=R*C*bpe,stored=h.padded*bpe;
    $('tq-t-cnt').innerHTML=RD.stat('Tile',tr+' x 128',tr<8?'small-tile rule':'')+RD.stat('Tiles',U.fmt(tilesR*tilesC),U.fmt(tilesR)+' x '+U.fmt(tilesC))+RD.stat('Stored shape','['+h.rows+', '+h.cols+']','')+
      RD.stat('Bytes needed',U.bytes(need),'')+RD.stat('Bytes stored',U.bytes(stored),'')+RD.stat('Padding factor',U.fmt(stored/need,2)+'x',U.pct(1-need/stored)+' wasted');
  }
  const an=RD.anim({card:'tq-t-card',ctl:'tq-t-ctl',n:6,draw,ms:2600,label:'Tiling step'});
  // MXU utilisation
  const MP=D.rc.mxu;$('tq-m-pre').innerHTML='<option value="-1">custom</option>'+MP.map((p,i)=>'<option value="'+i+'"'+(i===1?' selected':'')+'>'+E(p[0])+'</option>').join('');
  $('tq-m-pre').addEventListener('change',e=>{const i=+e.target.value;if(i>=0){$('tq-m-m').value=MP[i][1];$('tq-m-k').value=MP[i][2];$('tq-m-n').value=MP[i][3]}drawM()});
  function mxuPic(host,k,n,S){const W=Math.min(360,U.width(host)),pk=U.pad(k,S),pn=U.pad(n,S),sc=Math.min((W-20)/pn,160/pk),w=pn*sc,hh=pk*sc;
    let g='<rect x="10" y="20" width="'+w+'" height="'+hh+'" fill="var(--soft)" stroke="var(--line)"/><rect x="10" y="20" width="'+(n*sc)+'" height="'+(k*sc)+'" fill="var(--acc2)" stroke="var(--acc)"/>';
    const tk=pk/S,tn=pn/S;if(tk*tn<=400){for(let a=1;a<tn;a++)g+='<line x1="'+(10+a*S*sc)+'" x2="'+(10+a*S*sc)+'" y1="20" y2="'+(20+hh)+'" stroke="var(--c2)"/>';for(let b=1;b<tk;b++)g+='<line x1="10" x2="'+(10+w)+'" y1="'+(20+b*S*sc)+'" y2="'+(20+b*S*sc)+'" stroke="var(--c2)"/>'}
    g+=U.tx(10,13,S+' x '+S+' MXU: '+U.fmt(tk*tn)+' weight tile'+(tk*tn>1?'s':''),{fs:11,w:600});host.innerHTML=U.S(W,hh+28,g,'Weight tiles on a '+S+' MXU')}
  function drawM(){const m=Math.max(1,+$('tq-m-m').value||1),k=Math.max(1,+$('tq-m-k').value||1),n=Math.max(1,+$('tq-m-n').value||1);
    mxuPic($('tq-m-svg128'),k,n,128);mxuPic($('tq-m-svg256'),k,n,256);
    U.table($('tq-m-tab'),[['MXU',r=>r.S+' x '+r.S+' ('+r.g+')'],['Padded m x k x n',r=>U.pad(m,8)+' x '+U.pad(k,r.S)+' x '+U.pad(n,r.S),'num'],['Utilisation at best',r=>U.pct(U.mxuUtil(m,k,n,r.S),1),'num'],['Wasted multiply-adds',r=>U.pct(1-U.mxuUtil(m,k,n,r.S),1),'num']],
      [{S:128,g:'v4, v5e, v5p'},{S:256,g:'v6e, TPU7x'}],{narrow:true})}
  $('tq-m-pre').value='1';['tq-m-m','tq-m-k','tq-m-n'].forEach(id=>$(id).addEventListener('input',()=>{$('tq-m-pre').value='-1';drawM()}));
  drawM();RD.onRender(()=>{an.redraw();drawM()});RD.onResize(()=>{an.redraw();drawM()});
})();
