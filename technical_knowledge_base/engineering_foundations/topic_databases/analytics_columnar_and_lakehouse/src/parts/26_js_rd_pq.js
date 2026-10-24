// ---- Reading section 5: row group 0 metadata table of the 10M-row file ----
(function(){
  const $=id=>document.getElementById(id);
  // row group 0 of the 10M file
  const c0=D.full.rg0_columns;
  $('pqRg0').innerHTML='<table class="small"><thead><tr><th>Column</th><th>Type</th><th>Encodings</th><th class="num">Compressed</th><th class="num">Uncompressed</th><th>Min</th><th>Max</th></tr></thead><tbody>'+
    c0.map(c=>'<tr><td><code>'+c.col+'</code></td><td>'+c.physical+'</td><td>'+c.encodings.join(', ')+'</td><td class="num">'+FMT.mb(c.compressed)+'</td><td class="num">'+FMT.mb(c.uncompressed)+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.min).slice(0,22))+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.max).slice(0,22))+'</td></tr>').join('')+'</tbody></table>'+
    '<div class="small mute">'+D.full.created_by+'; codec SNAPPY for every chunk; 122,880 values each. "PLAIN_DICTIONARY" is how pyarrow names DuckDB\'s dictionary encoding (the spec now calls it RLE_DICTIONARY).</div>';
})();
