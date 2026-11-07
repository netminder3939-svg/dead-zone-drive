// Step 2 add-on (test build): cursed-fog palette on the raster map (no fog overlay) + soft player-color glow on claimed hexes (~60% of mockup 58). Icons untouched.
(function(){if(!window.L||!L.Canvas)return;const GLOW=0.6;
const _fs=L.Canvas.prototype._fillStroke;L.Canvas.prototype._fillStroke=function(ctx,layer){const o=layer.options;
  const claimed=o.color&&o.color===o.fillColor&&(o.weight>=3||o.dashArray==='5 5');if(!claimed)return _fs.apply(this,arguments);
  ctx.save();ctx.shadowColor=o.color;ctx.shadowBlur=(o.weight>=3?16:10)*GLOW;const keep=o.fillOpacity;o.fillOpacity=Math.min(keep,o.weight>=3?.22:.12);
  _fs.apply(this,arguments);o.fillOpacity=keep;
  // inner glow: second, thinner stroke at low opacity
  ctx.shadowBlur=0;ctx.globalAlpha=.35*GLOW;ctx.lineWidth=(o.weight||2)*2.6;ctx.strokeStyle=o.color;ctx.setLineDash([]);ctx.stroke();ctx.restore();};
})();
