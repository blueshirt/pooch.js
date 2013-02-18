(function(){pooch={version:"0.0.1",author:"Jeremy White",chart:function(c){return new I(c)},data:function(c){return new _data(c)},fetch:function(c){return _fetch(c)},map:function(c,b){return new pooch_map(c,b)},popup:function(c){return new _popup(c)},symbols:function(c){return new _symbol(c)},zoomControl:function(c){return new _zoomControl(c)}};pooch.supportsCanvas=!!document.createElement("canvas").getContext;var I=function(c){var b=this,a=0,j=0,e=null,d="chart"+_chartNdx,v=1,p=1,h=0,m=100,l=0,n=
100,q=0,s=100,r=0,u=100,y=1,w=1;_zoom=0;_zoomLevels=[1,2,4,8,16];_center={x:50,y:50};_offsetY=_offsetX=0;_cvsHidden=_ctxHidden=_ctxHltMain=_ctxMain=_ctxHltBack=_ctxBack=null;_isAnimating=!1;_isInteract=!0;_isDragging=_isMouseDown=!1;_zoomControl=null;_circle=2*Math.PI;_funcQueue=[];_sym=[];_symCur=_symObjCur=null;_symAction="over";_timeOut=null;_layersPre=[{_container:"div"}];_layersMain=[{_highlightMain:"canvas"},{_main:"canvas"},{_highlightBack:"canvas"},{_back:"canvas"}];_layersPost=[{_mouse:"div"},
{_popup:"div"}];var f=function(b){var a=pooch.helpers.keyFromObj(b),k=0===b[a]?0:"px";cssObj={};ndxPre=_layersPre.length;ndxMain=_layersMain.length;ndxPost=_layersPost.length;for(cssObj[a]=b[a]+k;ndxPre--;)k=pooch.helpers.keyFromObj(_layersPre[ndxPre]),k=pooch.fetch("#pooch"+k+"_"+d),k.css(cssObj).dom()[a]=b[a],"width"==a&&k.css({left:-(b.width/3)+"px"}),"height"==a&&k.css({top:-(b.height/3)+"px"});if(pooch.supportsCanvas)for(;ndxMain--;)k=pooch.helpers.keyFromObj(_layersMain[ndxMain]),pooch.fetch("#pooch"+
k+"_"+d).css(cssObj).dom()[a]=b[a];for(;ndxPost--;)k=pooch.helpers.keyFromObj(_layersPost[ndxPost]),pooch.fetch("#pooch"+k+"_"+d).css(cssObj).dom()[a]=b[a]},B=function(b){var a=pooch.fetch("#pooch_popup_"+d).dom();b(a)},G=function(b,k,E){var C=0,c=0,C=b.popup().offsetX(),c=b.popup().offsetY(),e=b.popup().width(),d=b.popup().height(),p=j/3,c=E-d-c-10<a/3?c:-d-c,C=k+C-e/2-10<p?p+-k+10:k+C+e/2+10>2*p?2*p-(k+e)-10:C+e/-2;b.popup().x(k+C).y(E+c)},A=function(b,J){if(!J){var E=b.localX,C=b.localY,c=!1,d=
!1,h=[],g=[],f=0,l=_sym.length,m=j,n=null,D=null;if(!_isMouseDown){for(var t=0;t<l;++t)if(_sym[t].interactive()){var q=_sym[t].state(),x;for(x in q){var r=0,w=0;switch(q[x].shape){case "circle":r=q[x].size;w=q[x].size;break;case "rect":case "hex":r=q[x].width/2;w=q[x].height/2;break;case "poly":a:{for(var c=q[x].shapePoints,s=[E,C],u=c.length;u--;){for(var z=c[u],y=!1,B=-1,H=z.length,A=H-1;++B<H;A=B)(z[B][1]<=s[1]&&s[1]<z[A][1]||z[A][1]<=s[1]&&s[1]<z[B][1])&&s[0]<(z[A][0]-z[B][0])*(s[1]-z[B][1])/
(z[A][1]-z[B][1])+z[B][0]&&(y=!y);if(y){c=!0;break a}}c=!1}}if("over"===_symAction){if(s=(u=_sym[t].map())?q[x].lng:q[x].x,u=u?q[x].lat:q[x].y,c||E<s+r&&E>s-r&&C<u+w&&C>u-w)h[f]=_sym[t],g[f]=q[x],d=!0,f++}else"closest"===_symAction&&(h[f]=_sym[t],g[f]=q[x],d=!0,f++)}}f=g.length;if(d){for(;f--;)g[f].drawFill&&(d=pooch.helpers.distanceToPoint(g[f].x,g[f].y,E,C),d<=m&&(n=h[f],D=g[f],m=d));g=n;symCur=D;if(_symCur!==symCur&&symCur){_symObjCur&&(_symObjCur.popup().hide(),"MAIN"===_symObjCur.layer().toUpperCase()?
k(_ctxHltMain,j,a):k(_ctxHltBack,j,a));D={};h="MAIN"===g.layer().toUpperCase()?"highlightMain":"highlightBack";_symObjCur=g;_symCur=symCur;D[_symCur.poochID]=_symCur;v=p=1;g=_symObjCur;m=_symObjCur.state();n=_symCur.poochID;if(!_symCur||m[n]!==_symCur[n])g.popup().layout(n),G(g,E,C);pooch.fetch(e).css({cursor:"pointer"});F(null,h,{obj:_symObjCur,key:D})}else _symCur===symCur&&symCur&&G(g,E,C)}else _symCur&&(_symObjCur.popup().hide(),pooch.fetch(e).css({cursor:"default"}),"MAIN"===_symObjCur.layer().toUpperCase()?
k(_ctxHltMain,j,a):k(_ctxHltBack,j,a)),_symCur=_symObjCur=null}}},x=function(b,a,k,C,c){var j={},d=b.state();if(1===C){var g=b.data().datum(),e=b.symAttrs();a[k].list=[];for(var f in e)a[k][f]="function"===typeof e[f]?e[f](a[k],g[k]):null!==e[f]?e[f]:a[k][f],a[k][f]!==d[k][f]&&a[k].list.push(f)}for(g=a[k].list.length;g--;)e=a[k].list[g],f=b.stepFunc(e),j[e]=f(C,d[k][e],a[k][e],c,a[k].easing);return j},z=function(b,a,k,c){if(pooch.supportsCanvas){var j=c?a.fillColorHighlight:a.fillColor,e=c?a.fillOpacityHighlight:
a.fillOpacity,f=c?a.drawStrokeHighlight:a.drawStroke,g=c?a.strokeWidthHighlight:a.strokeWidth,d=c?a.strokeColorHighlight:a.strokeColor,h=c?a.strokeOpacityHighlight:a.strokeOpacity;if(c?a.drawFillHighlight:a.drawFill)k.fillStyle="rgba("+j+","+e+")";f&&(k.lineWidth=g,k.strokeStyle="rgba("+d+","+h+")");b=(c=b.map())?a.lng:a.x;c=c?a.lat:a.y;switch(a.shape){case "circle":k.arc(b+_offsetX,c+_offsetY,a.size,0,_circle,!1);break;case "rect":k.rect(b-a.width/2+_offsetX,c-a.height/2+_offsetY,a.width,a.height);
break;case "bezcurve":break;case "line":k.moveTo(b,c);k.lineTo(a.xEnd,a.yEnd);break;case "hex":j=a.width/2;a=a.height/2;e=j/2;k.moveTo(b-e+_offsetX,c-a+_offsetY);k.lineTo(b+e+_offsetX,c-a+_offsetY);k.lineTo(b+j+_offsetX,c+_offsetY);k.lineTo(b+e+_offsetX,c+a+_offsetY);k.lineTo(b-e+_offsetX,c+a+_offsetY);k.lineTo(b-j+_offsetX,c+_offsetY);k.lineTo(b-e+_offsetX,c-a+_offsetY);break;case "poly":a=a.shapePoints;for(b=a.length;b--;){c=a[b].length-1;for(k.moveTo(a[b][c][0],a[b][c][1]);c--;)k.lineTo(a[b][c][0],
a[b][c][1])}break;default:k.arc(b+_offsetX,c+_offsetY,a.size,0,_circle,!1)}}},g=function(b,c){var e="";if(b)e=b.toUpperCase(),k(c?"HIGHLIGHTMAIN"===e?_ctxHltMain:_ctxHltBack:"MAIN"===e?_ctxMain:_ctxBack,j,a);else for(var f=_sym.length,g=!1,d=!1,h=!1;f--;)switch(e=_sym[f].layer().toUpperCase(),e){case "BACK":d||(d=!0,k(_ctxBack,j,a),k(_ctxHltBack,j,a));break;case "MAIN":g||(g=!0,k(_ctxMain,j,a),k(_ctxHltMain,j,a));break;default:h||(h=!0,k(_ctxHltMain,j,a),k(_ctxHltBack,j,a))}},F=function(b,a,k){clearTimeout(_timeOut);
b=k?!0:!1;var c=_sym.length;_isAnimating=!0;if(e){pooch.supportsCanvas&&g(a,k);for(var j=0;j<c;++j)if(void 0!==a&&n!==a.toUpperCase()?b:1){var f=b?k.key:_sym[j].datum(),d=b?k.obj:_sym[j],h=b?[pooch.helpers.keyFromObj(k.key)]:d.order(),m=b?1:h.length,n=d.layer().toUpperCase(),l=b?"MAIN"===n?_ctxHltMain:_ctxHltBack:"MAIN"===n?_ctxMain:_ctxBack;if(d.batch()&&!b){var h=d.batchObj(),D;for(D in h){m=h[D].length;for(l.beginPath();m--;){var q=h[D][m],t=x(d,f,q,v,p),s;for(s in d.symAttrs())t[s]=t[s]||f[q][s];
z(d,t,l,b)}l.fill();l.stroke()}}else for(q=0;q<m;++q){if(_isDragging)return;l.beginPath();var t=x(d,f,h[q],v,p),r;for(r in d.symAttrs())t[r]=t[r]||f[h[q]][r];z(d,t,l,b);var u=b?t.drawStrokeHighlight:t.drawStroke;(b?t.drawFillHighlight:t.drawFill)&&l.fill();u&&l.stroke()}}v++;if(v<=p&&1<p)_timeOut=setTimeout(F,1);else{v=1;for(a=_sym.length;a--;)b||_sym[a].state(!0);_zoomControl&&_zoomControl.update();_isAnimating=!1}}},k=function(b,a,k){b&&b.clearRect(0,0,a,k)},D=function(){y=(m-h)/j;w=(n-l)/a},t=
function(){_center.x=h+(m-h)/2;_center.y=l+(n-l)/2},H=function(){return 0},K=function(){return _zoomLevels.length-1},L=function(k){if(!arguments.length)return b;if(k.val instanceof Array){for(var c=[],e=k.val.length,d=h-(m-h),f=m+(m-h),g=l-(n-l),p=n+(n-l);e--;){var t=k.val[e].length;for(c[e]=[];t--;){c[e][t]=[];var q=a-a*((k.val[e][t][1]-g)/(p-g));c[e][t][0]=j*((k.val[e][t][0]-d)/(f-d));c[e][t][1]=q}}return c}e=(c="width"===k.dim)?j:a;f=m-h;g=n-l;d=c?h-f:l-g;f=c?m+f:n+g;return c?e*((k.val-d)/(f-d)):
e-e*((k.val-d)/(f-d))};b.bounds=function(k){if(!arguments.length)return _bounds;if(k.length)for(var c=k.length;c--;)_bounds[c]=k[c];else{var e=k.data().datum(),d=Number.MAX_VALUE,f=Number.MIN_VALUE,c=d,g=f,h;for(h in e)for(var p=e[h][k.shapeData()],l=p?p.length:0;l--;)for(var m=p[l].length;m--;){var n=p[l][m][0],x=p[l][m][1];n<c&&(c=n);n>g&&(g=n);x>f&&(f=x);x<d&&(d=x)}e=a/j;h=Math.abs(f-d)/Math.abs(g-c);e<h?(e=(g-c)*(h-e)/2,c-=e,g+=e):h<e&&(e=(f-d)*(e-h)/2,d-=e,f+=e);b.axisMinX(c);b.axisMaxX(g);b.axisMinY(d);
b.axisMaxY(f);q=c;s=g;r=d;u=f;D();t()}return b};b.symbols=function(a){if(!arguments.length)return _sym;for(var k=a.length,c=!1,d=0;d<k;++d)_sym[d]=a[d],_sym[d].chart(b,L),_sym[d].state(!0),e?(_sym[d].popup()&&B(_sym[d].popup().house),!c&&_sym[d].interactive()&&(b.mouseMove(A),b.mouseOut(A),c=!0)):(_funcQueue.push({func:B,arg:_sym[d].popup().house}),_funcQueue.push({func:b.mouseMove,arg:A}),_funcQueue.push({func:b.mouseOut,arg:A}));return b};b.width=function(a){if(!arguments.length)return j/3;j=3*
a;e?(f({width:j}),_cvsHidden.width=j,_cvsHidden.style.width=j+"px"):_funcQueue.push({func:f,arg:{width:j}});return b};b.height=function(k){if(!arguments.length)return a/3;a=3*k;e?(f({height:a}),_cvsHidden.height=a,_cvsHidden.style.height=a+"px"):_funcQueue.push({func:f,arg:{height:a}});return b};b.axisMinX=function(a){if(!arguments.length)return h;h=a;return b};b.axisMaxX=function(a){if(!arguments.length)return m;m=a;return b};b.axisMinY=function(a){if(!arguments.length)return l;l=a;return b};b.axisMaxY=
function(a){if(!arguments.length)return n;n=a;return b};b.reset=function(){h=q;m=s;l=r;n=u;t();b.zoom(0);return b};b.zoomControl=function(k){if(!arguments.length)return _zoomControl;_zoomControl=k;_zoomControl.target(b,H,K);e.appendChild(_zoomControl.domElem());_zoomControl.house(e);var c=pooch.fetch("#pooch_container_"+d).dom(),f={elem:null,init:function(){c.onmousedown=f.start},start:function(b){_isDragging=!0;if(_symObjCur){var a="MAIN"===_symObjCur.layer().toUpperCase()?"highlightMain":"highlightBack";
_symObjCur.popup().hide();g(a,!0);_symObjCur=_symCur=null}f.elem=this;var a=parseInt(f.elem.style.left,10),k=parseInt(f.elem.style.top,10);isNaN(a)&&(f.elem.style.left="0px");isNaN(k)&&(f.elem.style.top="0px");b=b?b:window.event;f.elem.mouseX=b.clientX;f.elem.mouseY=b.clientY;document.onmousemove=f.active;document.onmouseup=f.end;return!1},active:function(b){_isDragging=!0;var a=parseInt(f.elem.style.left,10),k=parseInt(f.elem.style.top,10);b=b?b:window.event;f.elem.style.left=a+(b.clientX-f.elem.mouseX)+
"px";f.elem.style.top=k+(b.clientY-f.elem.mouseY)+"px";f.elem.mouseX=b.clientX;f.elem.mouseY=b.clientY;return!1},end:function(){_isDragging=!1;var b=parseInt(f.elem.style.left,10),k=parseInt(f.elem.style.top,10),c=-(j/3),e=-(a/3),g=(b-c)*3*y,p=(k-e)*3*w;h-=g;m-=g;l+=p;n+=p;t();0!==b&&0!==k&&(F(),pooch.fetch("#pooch_container_"+d).css({top:e+"px",left:c+"px"}));document.onmousemove=null;document.onmouseup=null;f.elem=null}};f.init();_zoomControl.update();return b};b.zoomIn=function(){e&&_zoom+1<_zoomLevels.length&&
b.zoom(_zoom+1);return b};b.zoomOut=function(){e&&(0===_zoom-1?b.reset():0<=_zoom-1&&b.zoom(_zoom-1));return b};b.zoom=function(a){if(!arguments.length)return _zoom;_zoom=a;h=_center.x-(s-q)/2/_zoomLevels[_zoom];m=_center.x+(s-q)/2/_zoomLevels[_zoom];l=_center.y-(u-r)/2/_zoomLevels[_zoom];n=_center.y+(u-r)/2/_zoomLevels[_zoom];t();D();F();return b};b.zoomLevels=function(a){if(!arguments.length)return _zoomLevels;_zoomLevels=a;return b};b.draw=function(a,k){v=1;p=arguments.length?a:1;e?F(a,k):_funcQueue.push({func:F,
arg:null});return b};b.mouseMove=function(a){"function"===typeof a&&(a=function(b){A(b,_isAnimating||_isDragging)},e?pooch.fetch("#pooch_mouse_"+d).mouseMove(a):_funcQueue.push({func:b.mouseMove,arg:a}));return b};b.mouseOver=function(a){"function"===typeof a&&(e?pooch.fetch("#pooch_mouse_"+d).mouseOver(a):_funcQueue.push({func:b.mouseOver,arg:a}));return b};b.mouseOut=function(a){"function"===typeof a&&(e?pooch.fetch("#pooch_mouse_"+d).mouseout(function(){A({localX:-2E4,localY:-2E4})}):_funcQueue.push({func:b.mouseOut,
arg:a}));return b};b.activeSymbol=function(){return b};b.house=function(k){if(!arguments.length)return e;var c=pooch.fetch(k).dom();if(c){e=c;for(var c=[],f="",g=_layersPre.length,h=_layersMain.length,p=_layersPost.length;g--;){var l=pooch.helpers.keyFromObj(_layersPre[g]),f=_layersPre[g][l];c.push("<"+_layersPre[g][l]+" id='pooch"+l+"_"+d+"' width='"+j+"' height='"+a+"' style='position:relative;top:0;left:0;width:"+j+"px;height:"+a+"px;'>")}if(pooch.supportsCanvas){for(;h--;)g=pooch.helpers.keyFromObj(_layersMain[h]),
c.push("<"+_layersMain[h][g]+" id='pooch"+g+"_"+d+"' width='"+j+"' height='"+a+"' style='position:absolute;top:0;left:0;width:"+j+"px;height:"+a+"px;'></"+_layersMain[h][g]+">");_cvsHidden=document.createElement("canvas");_cvsHidden.id="poochCvsHidden_"+d;_cvsHidden.width=j;_cvsHidden.height=a;_cvsHidden.style.width=j+"px";_cvsHidden.style.height=a+"px";_ctxHidden=_cvsHidden.getContext("2d")}for(;p--;)h=pooch.helpers.keyFromObj(_layersPost[p]),c.push("<"+_layersPost[p][h]+" id='pooch"+h+"_"+d+"' width='"+
j+"' height='"+a+"' style='position:absolute;top:0;left:0;width:"+j+"px;height:"+a+"px;'></"+_layersPost[p][h]+">");c.push("</"+f+">");c=c.join("");e.innerHTML=c;_ctxBack=pooch.fetch("#pooch_back_"+d).dom().getContext("2d");_ctxMain=pooch.fetch("#pooch_main_"+d).dom().getContext("2d");_ctxHltMain=pooch.fetch("#pooch_highlightMain_"+d).dom().getContext("2d");_ctxHltBack=pooch.fetch("#pooch_highlightBack_"+d).dom().getContext("2d");d="chart"+_chartNdx++;for(c=_funcQueue.length;c--;)_funcQueue[c].func(_funcQueue[c].arg);
_funcQueue=[]}return b};if(!arguments.length||void 0===c)return b;b.house(c);return b};_symbol=function(c){var b=this,a=function(b,a,c,f,e){switch(e){case "easeInOut":return 1===f||b===f?c:-c/2*(Math.cos(Math.PI*b/f)-1)+a;case "easeIn":return c*b*b/(f*f)+a;default:return 1===f||b===f?c:a+(c-a)*(b/f)}},j=function(b,a,c){return c},e=function(b,a,c,f){function e(a,c){return a<c?(c-a)*(b/f)+a>>0:(a-c)*(1-b/f)+c>>0}if(1===b)return c;a=a.split(",");var d=c.split(",");c=e(a[0]>>0,d[0]>>0);var g=e(a[1]>>
0,d[1]>>0);a=e(a[2]>>0,d[2]>>0);return c+","+g+","+a},d=function(b){var a=b+"_pooch_proj_y",c;for(c in m.datum())m.datum()[c][a]=pooch.helpers.latToMercator(m.datum()[c][b]);g.lat=function(b,k){return r({dim:"height",val:k[a]})}},v=function(b){var a=b+"_pooch_proj_x",c;for(c in m.datum())m.datum()[c][a]=pooch.helpers.lngToMercator(m.datum()[c][b]);g.lng=function(b,c){return r({dim:"width",val:c[a]})}},p=function(a){if(!arguments.length)return b;var c=a.length;for(h={};c--;){var f=a[c];h[f]={};for(var e in g)h[f][e]=
g[e];h[f].poochID=f;n[c]=f}return b};b.sort=function(){_data&&"function"===typeof g.size&&n.sort(function(b,a){var c=g.size(h[b],m.datum(h[b].poochID));sizeB=g.size(h[a],m.datum(h[a].poochID));return sizeB-c});return b};b.data=function(a){if(!arguments.length)return m;m=a;p(m.keys());for(var c=x.length;c--;)x[c].func(x[c].arg);x=[];return b};b.batch=function(a){if(!arguments.length)return u;u=a;return b};b.chart=function(a,c){if(!arguments.length)return s;s=a;r=c;return b};b.symAttrs=function(a){if(!arguments.length)return g;
for(var c in a)_attr[c]=a[c];return b};b.datum=function(b){return!arguments.length?h:h[b]};b.stepFunc=function(b){return!arguments.length?F:F[b]};b.popup=function(a){if(!arguments.length)return l;l=a;l.data(b,m);f=!0;return b};b.drawFill=function(a){if(!arguments.length)return g.drawFill;g.drawFill=a;return b};b.drawStroke=function(a){if(!arguments.length)return g.drawStroke;g.drawStroke=a;return b};b.drawFillHighlight=function(a){if(!arguments.length)return g.drawFillHighlight;g.drawFillHighlight=
a;return b};b.fillColorHighlight=function(a){if(!arguments.length)return g.fillColorHighlight;g.fillColorHighlight=a;return b};b.fillOpacityHighlight=function(a){if(!arguments.length)return g.fillOpacityHighlight;g.fillOpacityHighlight=a;return b};b.drawStrokeHighlight=function(a){if(!arguments.length)return g.drawStrokeHighlight;g.drawStrokeHighlight=a;return b};b.strokeWidthHighlight=function(a){if(!arguments.length)return g.strokeWidthHighlight;g.strokeWidthHighlight=a;return b};b.strokeColorHighlight=
function(a){if(!arguments.length)return g.strokeColorHighlight;g.strokeColorHighlight=a;return b};b.strokeOpacityHighlight=function(a){if(!arguments.length)return g.strokeOpacityHighlight;g.strokeOpacityHighlight=a;return b};b.fillColor=function(a){if(!arguments.length)return g.fillColor;g.fillColor=a;y=!0;return b};b.size=function(a){if(!arguments.length)return g.size;g.size=a;return b};b.width=function(a){if(!arguments.length)return g.width;g.width=a;return b};b.height=function(a){if(!arguments.length)return g.height;
g.height=a;return b};b.fillOpacity=function(a){if(!arguments.length)return g.fillOpacity;g.fillOpacity=a;return b};b.strokeOpacity=function(a){if(!arguments.length)return g.strokeOpacity;g.strokeOpacity=a;return b};b.strokeColor=function(a){if(!arguments.length)return g.strokeColor;g.strokeColor=a;return b};b.strokeWidth=function(a){if(!arguments.length)return g.strokeWidth;g.strokeWidth=a;return b};b.interactive=function(a){if(!arguments.length)return f;f=a;return b};b.map=function(a){if(!arguments.length)return B;
B=a;return b};b.order=function(a){if(!arguments.length)return n;n=a;return b};b.batchObj=function(a){if(!arguments.length){if(y){w={};for(var c in h){var f="string"===typeof b.fillColor()?b.fillColor():b.fillColor()(h[c],m.datum()[c]);w.hasOwnProperty(f)?w[f].push(h[c].poochID):w[f]=[h[c].poochID]}y=!1}return w}w=a;return b};b.x=function(a){if(!arguments.length)return g.x;"string"===typeof a?(G=a,g.x=function(b,a){return r({dim:"width",val:a[G]})}):g.x=a;return b};b.y=function(a){if(!arguments.length)return g.y;
g.y="string"===typeof a?function(b,c){return r({dim:"height",val:c[a]})}:a;return b};b.lat=function(a){if(!arguments.length)return g.lat;"string"===typeof a?m?d(a):x.push({func:d,arg:a}):g.lat=pooch.helpers.latToMercator(a);return b};b.lng=function(a){if(!arguments.length)return g.lng;"string"===typeof a?m?v(a):x.push({func:v,arg:a}):g.lng=pooch.helpers.lngToMercator(a);return b};b.shapePoints=function(a){if(!arguments.length)return g.shapePoints;"string"===typeof a?(b.shapeData(a),m?g.shapePoints=
function(b,c){return r({sym:b,val:c[a]})}:x.push({func:b.shapePoints,arg:a})):g.shapePoints=a;return b};b.shapeData=function(a){if(!arguments.length)return A;"string"===typeof a&&(A=a);return b};b.shape=function(a){if(!arguments.length)return g.shape;g.shape=a;return b};b.layer=function(a){if(!arguments.length)return q;q=a;return b};b.easing=function(a){if(!arguments.length)return g.easing;g.easing=a;return b};b.state=function(){if(!arguments.length)return z;for(var a in h){z[a]={};for(var b in g)z[a][b]=
h[a][b];z[a].poochID=a}return z};var h={},m=null,l=null,n=[],q="main",s=null,r=null,u=!1,y=!1,w={},f=!1,B=null,G=null,A="",x=[],z={},g={x:0,y:0,lat:0,lng:0,visible:!0,shape:"circle",easing:"easeInOut",drawFill:!0,drawStroke:!0,size:6,height:6,width:6,fillColor:"200,200,200",fillOpacity:1,strokeColor:"255,255,255",strokeOpacity:1,strokeWidth:1,shapePoints:[],drawFillHighlight:!0,fillColorHighlight:"200,200,200",fillOpacityHighlight:1,drawStrokeHighlight:!0,strokeWidthHighlight:1,strokeColorHighlight:"0,0,0",
strokeOpacityHighlight:1},F={poochID:j,x:a,y:a,lat:a,lng:a,visible:j,shape:j,easing:j,drawFill:j,drawStroke:j,size:a,height:a,width:a,fillColor:e,fillOpacity:a,strokeColor:e,strokeOpacity:a,strokeWidth:a,shapePoints:function(a,b,c){return c},drawFillHighlight:j,fillColorHighlight:j,fillOpacityHighlight:j,drawStrokeHighlight:j,strokeWidthHighlight:j,strokeColorHighlight:j,strokeOpacityHighlight:j};if(!arguments.length)return b;b.shape(c);return b};_zoomControl=function(c){var b=this,a=null,j=null,
e=null,d=null,v=null,p=null,h=null,m=null,l=null,n=null,q=null,s=0,r=0,u=[],y=function(a,b){if(d){var c=pooch.fetch(b).dom();if(c)return c}else u.push({func:a,arg:b});return null},w=function(){e.reset()},f=function(){e.zoomIn()},B=function(){e.zoomOut()},G=function(){},A=function(){};b.house=function(a){if(!arguments.length)return d;var c=pooch.fetch(a).dom();c&&(d=c,d.appendChild(j));for(c=u.length;c--;)u[c].func(u[c].arg);u=[];v&&pooch.fetch(v).mouseDown(w);p&&pooch.fetch(p).mouseDown(f);h&&pooch.fetch(h).mouseDown(B);
m&&pooch.fetch(m).mouseDown(G);l&&pooch.fetch(l).mouseDown(A);return b};b.domElem=function(a){if(!arguments.length)return j;j=a;return b};b.target=function(a,c,f){if(!arguments.length)return e;e=a;null!==c&&(n=c);null!==f&&(q=f);return b};b.reset=function(a){if(!arguments.length)return v;v=y(b.reset,a);return b};b.zoomIn=function(a){if(!arguments.length)return p;p=y(b.zoomIn,a);return b};b.zoomOut=function(a){if(!arguments.length)return h;h=y(b.zoomOut,a);return b};b.handle=function(a){if(!arguments.length)return m;
m=y(b.handle,a);return b};b.slider=function(a){if(!arguments.length)return l;l=y(b.slider,a);return b};b.top=function(a){if(!arguments.length)return s;s=a;pooch.fetch(j).css({top:s+"px"});return b};b.left=function(a){if(!arguments.length)return r;r=a;pooch.fetch(j).css({left:r+"px"});return b};b.update=function(){var a=null!==n?n():e.zoomMin(),c=null!==q?q():e.zoomMax(),a=parseInt(pooch.fetch(l).css("height"),10)/(c-a),c=(c-e.zoom())*a>>0;pooch.fetch(m).css({top:c+"px"});return b};if(!arguments.length)return b;
"string"===typeof c&&(null!==document.getElementById(c)&&void 0!==document.getElementById(c))&&(a=document.getElementById(c),j=document.createElement("div"),j.style.borderStyle="none",j.style.borderWidth="0px",j.style.position="absolute",j.style.display="block",j.innerHTML=a.innerHTML,b.domElem(j));return b};_popup=function(c){var b=this,a=null,j=null,e=null,d=null,v=0,p=0,h=0,m=24,l=0,n=0;b.house=function(c){if(!arguments.length)return e;var d=pooch.fetch(c).dom();d&&(e=d,e.appendChild(a));return b};
b.width=function(a){if(!arguments.length)return l;l=a;return b};b.height=function(c){if(!arguments.length)return n;n=c;pooch.fetch(a).css({height:n+"px"});return b};b.offsetX=function(a){if(!arguments.length)return h;h=a;return b};b.offsetY=function(a){if(!arguments.length)return m;m=a;return b};b.x=function(c){if(!arguments.length)return v;v=c;pooch.fetch(a).css({left:v+"px"});return b};b.y=function(c){if(!arguments.length)return p;p=c;pooch.fetch(a).css({top:p+"px"});return b};b.hide=function(){pooch.fetch(a).css({top:"-3000px",
left:"-3000px"});return b};b.layout=function(c){if(!arguments.length)return a.innerHTML;for(var e=j.innerHTML,h=[{text:RegExp(/exec(\s*)\{(.*?)\}/g),chunk:RegExp(/\{(.*?)\}/),js:!0,obj:!1},{text:RegExp(/data\.(.*?)[^a-zA-Z0-9_]/g),chunk:RegExp(/\.(.*?)[^a-zA-Z0-9_]/),js:!1,obj:!0},{text:RegExp(/data(\s*)\[(.*?)\]/g),chunk:RegExp(/\[(.*?)\]/),js:!0,obj:!0}],p=h.length;p--;)for(var l=e.match(h[p].text),m=l?l.length:0;m--;)var f=h[p].chunk.exec(l[m])[1].replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,"").replace(/\s+/g,
" "),n=!h[p].js?l[m].substr(5,l[m].length).match(/[^a-zA-Z0-9_]/):"",f=(h[p].js?h[p].obj?d.datum()[c][eval(f)]:eval(f):d.datum()[c][f])+n,e=e.replace(l[m],f);b.hide();a.innerHTML=e;b.width(a.clientWidth);b.height(a.clientHeight);return b};b.data=function(a,c){if(!arguments.length)return d;null!==c&&void 0!==c&&(d=c);return b};if(!arguments.length)return b;"string"===typeof c&&(null!==document.getElementById(c)&&void 0!==document.getElementById(c))&&(j=document.getElementById(c),a=document.createElement("div"),
a.style.borderStyle="none",a.style.borderWidth="0px",a.style.position="absolute",a.style.display="block");return b};_data=function(c){var b=this,a=[null],j={},e="",d=!1;b.key=function(c){if(!arguments.length)return e;var p=a.length,h=0,m=0,l=[];for(e=c;p--;){var n=a[p][c].length;l[p]={};n>m&&(h=p,m=n);for(;n--;)l[p][a[p][c][n]]=n}for(;m--;){n=a[h][c][m];j[n]={};for(var q in a[h])j[n][q]=a[h][q][m];for(p=a.length;p--;)if(p!==h){var s=l[p][n],r;for(r in a[p])j[n][r]=a[p][r][s]}}d=!0;return b};b.keys=
function(){var a=[],b;for(b in j)a.push(b);return a};b.datum=function(c,e){if(!arguments.length)return d?j:a;if(c)if(e)d?j[c]=e:a[c]=e;else return d?j[c]:a[c];return b};if(!arguments.length)return b;a=c;return b};pooch_map=function(c,b){var a=this,j=!0,e=!1,d=null,v=[],p=500,h=500,m=null,l={lat:37.090238,lng:-95.7129,zoom:4},n=5,q=18,s=2,r=null,u=null,y=[],w=null;a.house=function(b){if(!arguments.length)return w;w=pooch.fetch(b).dom();return a};a.chart=function(b){if(!arguments.length)return r;r=
b;return a};a.draw=function(b){if(r){var c=y.length;if(c){for(;c--;)y[c].func(y[c].arg);y=[]}r.draw(b)}else a.init();return a};a.zoomControl=function(b){if(!arguments.length)return u;u=b;u.target(a,null,null);return a};a.api=function(b){if(!arguments.length)return _api;j="GOOGLE"===b.toUpperCase()?!0:!1;e="BING"===b.toUpperCase()?!0:!1;return a};a.map=function(b){if(!arguments.length)return d;d=b;return a};a.symbols=function(b){if(!arguments.length)return v;if(r){var c=b.length;r.symbols(b);for(var e=
0;e<c;++e)v[e]=r.symbols()[e],v[e].map(a)}else y.push({func:a.symbols,arg:b});return a};a.reset=function(){d&&a.center({lat:l.lat,lng:l.lng}).zoom(l.zoom);return a};a.zoom=function(b){if(!arguments.length)return n;n=b;d&&(j&&d.getZoom()!=n?d.setZoom(n):e&&d.setView({zoom:n}));return a};a.zoomMax=function(b){if(!arguments.length)return q;q=b;return a};a.zoomMin=function(b){if(!arguments.length)return s;s=b;return a};a.defaultView=function(b){if(!arguments.length)return l;"undefined"!==typeof b.lat&&
(l.lat=b.lat);"undefined"!==typeof b.lng&&(l.lng=b.lng);"undefined"!==typeof b.zoom&&(l.zoom=b.zoom);return a};a.zoomIn=function(){if(d){if(j||e)n=d.getZoom();n+1<=q&&a.zoom(n+1)}return a};a.zoomOut=function(){if(d){if(j||e)n=d.getZoom();n-1>=s&&a.zoom(n-1)}return a};a.center=function(b){if(!arguments.length)return m;m=b;d&&j&&d.setCenter(new google.maps.LatLng(m.lat,m.lng));return a};a.width=function(b){if(!arguments.length)return w?parseInt(pooch.fetch(w).css("width"),10):p;p=b;return a};a.height=
function(b){if(!arguments.length)return w?parseInt(pooch.fetch(w).css("height"),10):h;h=b;return a};a.loadMap=function(){if(j){var b={disableDefaultUI:!0,zoom:l.zoom,center:new google.maps.LatLng(l.lat,l.lng),mapTypeControlOptions:{mapTypeIds:["poochStyle",google.maps.MapTypeId.ROADMAP]}},c=new google.maps.StyledMapType([{featureType:"all",elementType:"all",stylers:[{lightness:33},{gamma:0.8},{saturation:-61}]},{featureType:"road.local",elementType:"geometry",stylers:[{saturation:-73},{lightness:33},
{gamma:0.8},{visibility:"simplified"}]},{featureType:"road.arterial",elementType:"geometry",stylers:[{saturation:-91},{gamma:0.8},{visibility:"simplified"},{lightness:100}]},{featureType:"road.arterial",elementType:"labels",stylers:[{visibility:"off"}]},{featureType:"road.highway",elementType:"geometry",stylers:[{visibility:"simplified"},{saturation:-91},{gamma:0.8},{lightness:94}]},{featureType:"road.highway",elementType:"labels",stylers:[{visibility:"off"}]},{featureType:"landscape.man_made",elementType:"geometry",
stylers:[{visibility:"simplified"},{gamma:0.76}]}]);d=new google.maps.Map(w,b);d.mapTypes.set("poochStyle",c);d.setMapTypeId("poochStyle");new M(a)}else e&&(d=new Microsoft.Maps.Map(w,{credentials:"TODO add the option to initialize with credentials",center:new Microsoft.Maps.Location(l.lat,l.lng),mapTypeId:Microsoft.Maps.MapTypeId.road,showDashboard:!1,showScalebar:!1,zoom:l.zoom,height:a.height(),width:a.width()}));u&&(w.appendChild(u.domElem()),u.house(w))};a.init=function(){if(j){var b=document.createElement("script");
b.setAttribute("type","text/javascript");b.setAttribute("src","http://maps.google.com/maps/api/js?sensor=false&callback=pooch_initMapAPIs");document.body.appendChild(b)}else e&&(b=document.createElement("script"),b.setAttribute("type","text/javascript"),b.setAttribute("src","http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&onScriptLoad=pooch_initMapAPIs"),document.body.appendChild(b));return a};if(!arguments.length)return a;w=pooch.fetch(c).dom();return!w?a:pooch_baseMap=a};var M=function(c){var b=
this,a=null,j=c.map(),e=c.chart(),d=null;b.prototype=new google.maps.OverlayView;var v=function(){a=j.getBounds();var d=b.prototype.getProjection(),h=google.maps.Point,m=new google.maps.LatLng(a.getNorthEast().lat(),a.getSouthWest().lng()),l=d.fromLatLngToDivPixel(m),m=d.fromDivPixelToLatLng(new h(l.x,l.y)),d=d.fromDivPixelToLatLng(new h(l.x+c.width(),l.y+c.height())),h=m.lng(),n=d.lng(),q=h;0<h&&0>n?q=-180+-1*(180-h):0>h&&0>n&&h>n?q=-360+h:0<h&&(0<n&&h>n)&&(q=h-360);e.axisMinX(pooch.helpers.lngToMercator(q)).axisMaxX(pooch.helpers.lngToMercator(n)).axisMaxY(pooch.helpers.latToMercator(m.lat())).axisMinY(pooch.helpers.latToMercator(d.lat()));
N?(pooch.fetch(e.house()).css({display:"none"}),c.draw(),setTimeout(function(){pooch.fetch(e.house()).css({top:l.y+"px",left:l.x+"px",display:"block"});c.zoom(j.getZoom());c.zoomControl().update()},1)):(c.draw(),pooch.fetch(e.house()).css({top:l.y+"px",left:l.x+"px",display:"block"}),c.zoom(j.getZoom()),c.zoomControl().update())};b.bounds=function(c){if(!arguments.length)return a;a=c;return b};b.prototype.onAdd=function(){var a=document.createElement("div");a.style.borderStyle="none";a.style.borderWidth=
"0px";a.style.position="absolute";d=a;b.prototype.getPanes().overlayMouseTarget.appendChild(a);e=new pooch.chart(a);c.chart(e);e.height(c.height()).width(c.width());v();google.maps.event.addListener(j,"dragend",function(){v()});google.maps.event.addListener(j,"zoom_changed",function(){c.zoomControl()&&c.zoomControl().slider()&&v()})};b.prototype.draw=function(){};b.prototype.onRemove=function(){d.parentNode.removeChild(d);d=null};b.prototype.setMap(j)};_fetch=function(c){var b=this,a=null,j=function(c){return!arguments.length?
b:a.currentStyle?a.currentStyle[c]:document.defaultView&&document.defaultView.getComputedStyle?document.defaultView.getComputedStyle(a,"")[c]:a.style[c]};b.css=function(c){if("string"===typeof c)return j(c);for(var d in c)if(void 0===_css2js[d]){var v=a.style,p;var h=d;p=h.split("-");var m=p.length;if(1===m)p=p[0];else{for(var h="-"===h.charAt(0)?p[0].charAt(0).toUpperCase()+p[0].substring(1):p[0],l=1;l<m;l++)h+=p[l].charAt(0).toUpperCase()+p[l].substring(1);p=h}v[p]=c[d]}else a.style[_css2js[d]]=
c[d];return b};b.dom=function(){return a};b.mouseOver=function(c){"function"===typeof c&&(a.onmouseover=function(b){_mouseEvent(a,b,c)});return b};b.mouseMove=function(c){"function"===typeof c&&(a.onmousemove=function(b){_mouseEvent(a,b,c)});return b};b.mouseDown=function(c){"function"===typeof c&&(a.onmousedown=function(b){_mouseEvent(a,b,c)});return b};b.mouseout=function(c){"function"===typeof c&&(a.onmouseout=function(b){_mouseEvent(a,b,c)});return b};b.removeEvent=function(){return b};if(!arguments.length||
void 0===c)return b;if("string"===typeof c)"#"===c.substr(0,1)?a=document.getElementById(c.substr(1,c.length)):"."===c.substr(0,1)?a=document.getElementsByClassName(c.substr(1,c.length))[0]:null!==document.getElementById(c)&&void 0!==document.getElementById(c)&&document.getElementById(c);else if(c.tagName||c.nodeName)a=c;return b};pooch.helpers={keyFromObj:function(c){for(var b in c)if(c.hasOwnProperty(b))return b;return null},formatNumber:function(c){c=c.toString();parts=c.toString().split(".");
parts[0]=parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g,"$1,");return parts.join(".")},distanceToPoint:function(c,b,a,j){return Math.sqrt((c-=a)*c+(b-=j)*b)},latToMercator:function(c){c=Math.sin(c*(Math.PI/180));return 3189068.5*Math.log((1+c)/(1-c))},lngToMercator:function(c){return 111319.49079327169*c},indexOf:function(c,b){for(var a=c.length;a--;)if(c[a]===b)return a}};window.pooch_initMapAPIs=function(){pooch_baseMap.loadMap()};window.pooch_baseMap=null;var N="object"===typeof navigator.vendor&&
-1!==navigator.vendor.indexOf("Apple")?!0:!1;_chartNdx=0;_css2js={"float":"styleFloat","text-decoration: blink":"textDecorationBlink","text-decoration: line-through":"textDecorationLineThrough","text-decoration: none":"textDecorationNone","text-decoration: overline":"textDecorationOverline","text-decoration: underline":"textDecorationUnderline"};_mouseEvent=function(c,b,a){c=c.getBoundingClientRect();var j=c.top;b.localX=b.clientX-c.left;b.localY=b.clientY-j;a(b)}})();