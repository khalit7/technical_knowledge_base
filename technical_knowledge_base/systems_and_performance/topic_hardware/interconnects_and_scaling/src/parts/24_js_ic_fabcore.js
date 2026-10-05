// ---- Fabric model: a line-by-line port of src/fabric.py (checked against it by check/check_page.mjs) ----
window.ICFAB=(function(){
  function switchPorts(fabric,srv,over){const down=8*srv;if(fabric==='railonly')return down;const up=down/over;return down+2*up}
  function loads(fabric,pattern,srv,V,o){
    o=o||{};const nic=o.nic!=null?o.nic:50,nvl=o.nvl!=null?o.nvl:450,over=o.over!=null?o.over:1,rack=o.rack!=null?o.rack:2;let pxn=!!o.pxn;
    const G=8,N=G*srv;if(fabric==='railonly')pxn=true;
    const L={nvlink:0,nic:0,spine:0},C={nvlink:nvl,nic:nic,spine:null};
    if(fabric==='rail')C.spine=srv*nic/over;else if(fabric==='tor')C.spine=rack*G*nic/over;
    if(pattern==='dp_ring'||pattern==='pp'){
      const per=pattern==='dp_ring'?2*(srv-1)/srv*V:V;
      if(srv>1){L.nic=per;if(fabric==='tor'){const racks=Math.ceil(srv/rack);L.spine=racks>1?G*per:0}}
    }else if(pattern==='a2a'){
      const piece=V/N,intra=(G-1)*piece,same=(srv-1)*piece,cross=(srv-1)*(G-1)*piece;
      L.nic=same+cross;
      if(pxn){L.nvlink=intra+cross;L.spine=0}
      else{L.nvlink=intra;if(fabric==='rail')L.spine=srv*cross;else if(fabric==='tor'){const remote=(srv-Math.min(rack,srv))*G*piece;L.spine=rack*G*remote}}
    }else throw new Error(pattern);
    const t={};Object.keys(L).forEach(k=>{t[k]=C[k]?L[k]/(C[k]*1e9):0});
    if(fabric==='railonly')t.spine=0;
    let worst='nvlink';Object.keys(t).forEach(k=>{if(t[k]>t[worst])worst=k});
    return {load:L,cap:C,time:t,worst,total:t[worst],ports:switchPorts(fabric,srv,over)};
  }
  return {loads,switchPorts};
})();
