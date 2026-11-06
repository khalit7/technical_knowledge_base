// ---- Reading tab: a closed details block has no width, so redraw everything when one opens ----
document.addEventListener('toggle',e=>{if(e.target&&e.target.open)window.dispatchEvent(new Event('resize'))},true);
