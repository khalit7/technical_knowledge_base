// ---- Reading, top: the hero figure (static annotated diagram of the chat product spread over machines) ----
(function(){
  const el=document.getElementById('rd-hero-svg');if(!el)return;
  function draw(){
    const W=Math.min(760,RD.width(el)),nar=W<560,H=nar?262:236;
    const acc='var(--acc)',good='var(--good)',bad='var(--bad)',mu='var(--mute)';
    let g='<defs><marker id="hr-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker>'+
      '<marker id="hr-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--bad)"/></marker></defs>';
    const rect=(x,y,w,h,st,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(fill||'var(--soft)')+'" stroke="'+st+'" stroke-width="1.5"/>';
    const arr=(x1,y1,x2,y2,c,dash,mk)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 4"':'')+' marker-end="url(#'+(mk||'hr-a')+')"/>';
    const badge=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+acc+'"/>'+RD.t(x,y+4,String(n),{a:'middle',fs:11,w:600,fill:'var(--bg)'});
    // top row: Ana, app server, consensus group
    const tw=(W-16)/3,ty=8,th=40;
    const cx=[8+tw/2,8+tw*1.5,8+tw*2.5],bw=tw-12;
    g+=rect(cx[0]-bw/2,ty,bw,th,'var(--line)')+RD.t(cx[0],ty+17,'Ana',{a:'middle',fs:12,w:600})+RD.t(cx[0],ty+32,nar?'phone + laptop':'phone and laptop',{a:'middle',fs:11,fill:mu});
    g+=rect(cx[1]-bw/2,ty,bw,th,'var(--line)')+RD.t(cx[1],ty+17,'App servers',{a:'middle',fs:12,w:600})+RD.t(cx[1],ty+32,'stateless',{a:'middle',fs:11,fill:mu});
    g+=rect(cx[2]-bw/2,ty,bw,th,acc)+RD.t(cx[2],ty+17,nar?'etcd, 3 nodes':'etcd: 3 nodes, Raft',{a:'middle',fs:12,w:600})+RD.t(cx[2],ty+32,nar?'shard leaders':'who leads each shard',{a:'middle',fs:11,fill:mu});
    g+=arr(cx[0]+bw/2,ty+th/2,cx[1]-bw/2-2,ty+th/2,mu);
    g+=arr(cx[1]+bw/2,ty+th/2,cx[2]-bw/2-2,ty+th/2,mu,1);
    g+=badge(cx[2]+bw/2-4,ty+2,4);
    // shards: title at the bottom so the arrows from the app servers do not cross it
    const sy=nar?104:96,sh=nar?150:126,sw=(W-16-16)/3,gy=(ty+th+sy)/2+4;
    const names=['users A to H','users I to P','users Q to Z'];
    for(let k=0;k<3;k++){const x=8+k*(sw+8);
      g+=rect(x,sy,sw,sh,'var(--line)','var(--bg)');
      const ly=sy+12,bh=26,lw=sw-20;
      g+=rect(x+10,ly,lw,bh,good,'var(--open2)')+RD.t(x+sw/2,ly+17,'leader',{a:'middle',fs:11.5,w:600});
      const fy=ly+bh+30,fw=(lw-6)/2;
      for(let f=0;f<2;f++){const fx=x+10+f*(fw+6);g+=rect(fx,fy,fw,bh,'var(--line)')+RD.t(fx+fw/2,fy+17,nar?'F'+(f+1):'follower',{a:'middle',fs:11});
        g+=arr(x+sw/2,ly+bh,fx+fw/2,fy-2,good)}
      if(nar){g+=RD.t(x+sw/2,fy+bh+20,'Shard '+(k+1),{a:'middle',fs:11.5,w:600})+RD.t(x+sw/2,fy+bh+35,names[k].replace('users ',''),{a:'middle',fs:11,fill:mu})}
      else g+=RD.t(x+sw/2,fy+bh+22,'Shard '+(k+1)+': '+names[k],{a:'middle',fs:12,w:600});
      if(k===1){// Ana's write to the leader and a read from a follower
        const tx=x+10+fw+6+fw/2;
        g+=arr(cx[1]-14,ty+th,x+sw/2-10,ly-2,acc);
        g+=RD.t(cx[1]-20,gy,nar?'write':'write "hello"',{a:'end',fs:11,fill:acc,w:600});
        g+=arr(cx[1]+14,ty+th,tx+4,fy-2,bad,1,'hr-b');
        g+=RD.t(cx[1]+34,gy,nar?'read?':'read: is "hello" there?',{fs:11,fill:bad,w:600});
        g+=badge(tx+14,fy-12,3)}
    }
    g+=badge(14,sy-2,1)+badge(8+sw/2,sy+12+26+15,2);
    el.innerHTML=RD.svg(W,H,g,'Ana, app servers and an etcd group above three shards; each shard has a leader and two followers; a write goes to shard 2\'s leader and a read to one of its followers');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
