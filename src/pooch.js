(function ()
{
  pooch = { version: "0.0.3" , author: "Jeremy White"};

  pooch.chart = function (id)
  {
    return new _chart (id);
  };

  pooch.data = function (obj)
  {
    return new _data (obj);
  };

  pooch.fetch = function (elem)
  {
    return _fetch (elem);
  };

  pooch.log = function (obj)
  {
    if (window.console && window.console.log) console.log (obj);
  };

  pooch.map = function (elem, options)
  {
    return new pooch_map (elem, options);
  };

  pooch.popup = function (elem)
  {
    return new _popup (elem);
  };

  pooch.symbolGroup = function (shape)
  {
    return new _symbolGroup (shape);
  };

  pooch.zoomControl = function (elem)
  {
    return new _zoomControl (elem);
  };

  pooch.supportsCanvas = !!document.createElement ('canvas').getContext;

  var _chart = function (id)
  {
    var _chartScope   = this,
        _height       = 0,
        _width        = 0,
        _house        = null,
        _hasMap       = false,
        _id           = "chart" + _chartNdx,
        _hasLayout    = false,
        _stepCnt      = 1,
        _stepTot      = 1,
        _wholeNums    = false,
        _axisMinX     = 0,
        _axisMaxX     = 100,
        _axisMinY     = 0,
        _axisMaxY     = 100,
        _axisDefaults = { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        _unitsPerPx   = { x: 1, y: 1 };
        _zoom         = 0,
        _zoomLevels   = [1, 2, 4, 8, 16],
        _center       = { x: 50, y: 50 },
        _offsetX      = 0,
        _offsetY      = 0,
        _ctxBack      = null,
        _ctxHltBack   = null,
        _ctxMain      = null,
        _ctxHltMain   = null,
        _ctxHidden    = null,
        _cvsHidden    = null,
        _isAnimating  = false,
        _isInteract   = true,
        _isMouseDown  = false,
        _isDragging   = false,
        _zoomControl  = null,
        _projection   = null,
        _mouseIgnore  = false,
        _circle       = Math.PI * 2,
        _funcQueue    = [],
        _symGrp       = [],
        _symGrpCur    = null,
        _symCur       = null,
        _symAction    = "over",
        _timeOut      = null,
        _layersPre    = [{_container: "div"}],
        _layersMain   = [{_highlightMain: "canvas"}, {_main: "canvas"}, {_highlightBack: "canvas"}, {_back: "canvas"}],
        _layersPost   = [{_mouse: "div"}, {_popup: "div"}];

    var _adjustLayout = function (obj)
    {
      var attrKey = pooch.helpers.keyFromObj (obj),
          px      = obj[attrKey] === 0 ? 0 : "px";
          cssObj  = {};
          ndxPre  = _layersPre.length,
          ndxMain = _layersMain.length,
          ndxPost = _layersPost.length;

      cssObj[attrKey] = obj[attrKey] + px;

      while (ndxPre--)
      {
        var keyPre   = pooch.helpers.keyFromObj (_layersPre[ndxPre]),
            fetchPre = pooch.fetch ("#pooch" + keyPre + "_" + _id);

        fetchPre.css (cssObj).dom ()[attrKey] = obj[attrKey];
        if (attrKey == "width") fetchPre.css ({ left: -(obj.width / 3) + "px" });
        if (attrKey == "height") fetchPre.css ({ top: -(obj.height / 3) + "px" });
      }

      if (pooch.supportsCanvas)
      {
        while (ndxMain--)
        {
          var keyMain = pooch.helpers.keyFromObj (_layersMain[ndxMain]);
          pooch.fetch ("#pooch" + keyMain + "_" + _id).css (cssObj).dom ()[attrKey] = obj[attrKey];
        }
      }
      else
      {
        // TODO: Add non-canvas layout changes
      }

      while (ndxPost--)
      {
        var keyPost = pooch.helpers.keyFromObj (_layersPost[ndxPost]);
        pooch.fetch ("#pooch" + keyPost + "_" + _id).css (cssObj).dom ()[attrKey] = obj[attrKey];
      }
    };

    var _popHouse = function (popHouse)
    {
      var popDiv = pooch.fetch ("#pooch_popup_" + _id).dom ();
      popHouse (popDiv);
    };

    var _fillPop = function (symGrp, sym, id, x, y)
    {
      if (!_symCur || sym[id] !== _symCur[id])
      {
        symGrp.popup ().layout (id);
        _movePop (symGrp, x, y);
      }
    };

    var _movePop = function (symGrp, x, y)
    {
      var xAdj    = 0,
          yAdj    = 0,
          popOffX = symGrp.popup ().offsetX (),
          popOffY = symGrp.popup ().offsetY (),
          width   = symGrp.popup ().width (),
          height  = symGrp.popup ().height (),
          visHgt  = _height / 3,
          visWid  = _width / 3;

      if (y - height - popOffY - 10 < visHgt) yAdj = popOffY;
      else yAdj = -height - popOffY;
      if (x + popOffX - (width / 2) - 10 < visWid) xAdj = visWid + -x + 10;
      else if (x + popOffX + (width / 2) + 10 > visWid * 2) xAdj = visWid * 2 - (x + width) - 10;
      else xAdj = popOffX + (width / -2);

      symGrp.popup ().x (x + xAdj)
                    .y (y + yAdj);
    };

    var _findSymGrp = function (ndx)
    {
      var len    = _sym.length,
          count  = 0,
          addCnt = 0;

      while (count < len)
      {
        if (ndx < addCnt + _symGrp[count].order ().length) return { sym: _symGrp[count], ndx: ndx - addCnt };
        addCnt += _symGrp[count].order ().length;
        count++;
      }
    };

    var _loopThroughPolys = function (shape, point)
    {
      var pntInPoly = function (poly, pt)
          {
            for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1])) &&
                (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) &&
                (c = !c);
            return c;
          };

      var borderLen = shape.length;
      while (borderLen--) if (pntInPoly (shape[borderLen], point)) return true;
      return false;
    };

    var _mouseMoveChart = function (e, ignore)
    {
      if (!ignore)
      {
        var x             = e.localX,
            y             = e.localY,
            found         = false,
            symFnd        = false,
            symGrpsFnd    = [],
            symsFnd       = [],
            count         = 0,
            len           = _symGrp.length,
            closestDist   = _width,
            symGrpClosest = null,
            symClosest    = null;

        if (!_isMouseDown)
        {
          for (var i = 0; i < len; ++i)
          {
            if (_symGrp[i].interactive ())
            {
              var sym = _symGrp[i].state ();

              for (var obj in sym)
              {
                var adjWid = 0,
                    adjHgt = 0;

                switch (sym[obj].shape)
                {
                  case "circle":
                    adjWid = sym[obj].size;
                    adjHgt = sym[obj].size;
                  break;

                  case "rect":
                  case "hex":
                    adjWid = sym[obj].width / 2;
                    adjHgt = sym[obj].height / 2;
                  break;

                  case "poly":
                    found = _loopThroughPolys (sym[obj].shapePoints, [x, y]);
                    break;

                  case "custom":
                    found = _symGrp[i].customShape ().hitTest (sym[obj], x, y);
                    break;

                  default:
                    // TODO: add default
                }

                if (_symAction === "over")
                {
                  var isMap   = _symGrp[i].map (),
                      horVar  = isMap ? sym[obj].lng : sym[obj].x,
                      vertVar = isMap ? sym[obj].lat : sym[obj].y;

                  if (found ||
                      (x < horVar + adjWid &&
                       x > horVar - adjWid &&
                       y < vertVar + adjHgt &&
                       y > vertVar - adjHgt))
                  {
                    symGrpsFnd[count] = _symGrp[i];
                    symsFnd[count]    = sym[obj];
                    symFnd            = true;
                    count++;
                  }
                }
                else if (_symAction === "closest")
                {
                  symGrpsFnd[count] = _symGrp[i];
                  symsFnd[count]    = sym[obj];
                  symFnd            = true;
                  count++;

                }
              }
            }
          }

          var j = symsFnd.length;

          if (symFnd)
          {
            while (j--)
            {
              if (symsFnd[j].drawFill)
              {
                var curDist = pooch.helpers.distanceToPoint (symsFnd[j].x, symsFnd[j].y, x, y);

                if (curDist <= closestDist)
                {
                  symGrpClosest = symGrpsFnd[j];
                  symClosest    = symsFnd[j];
                  closestDist   = curDist;
                }
              }
            }

            var symGrpCur   = symGrpClosest;
                symCur      = symClosest;
                symFnd      = true;

            if (_symCur !== symCur && symCur)
            {
              if (_symGrpCur)
              {
                // TODO Clean this up. No need to clear ctx here and then from _drawSymGrps ().
                _symGrpCur.popup ().hide ();
                if (_symGrpCur.layer ().toUpperCase () === "MAIN") _clearCtx (_ctxHltMain, _width, _height);
                else _clearCtx (_ctxHltBack, _width, _height);
              }

              var keyObj              = {},
              layer                   = symGrpCur.layer ().toUpperCase () === "MAIN" ? "highlightMain" : "highlightBack";
              _symGrpCur              = symGrpCur;
              _symCur                 = symCur;
              keyObj[_symCur.poochID] = _symCur;
              _stepCnt                = _stepTot     = 1;
              _fillPop (_symGrpCur, _symGrpCur.state (), _symCur.poochID, x, y);
              pooch.fetch (_house).css ({ cursor: "pointer"});
              _drawSymGrps (null, layer, { obj: _symGrpCur, key: keyObj });
            }
            else if (_symCur === symCur && symCur)
            {
              _movePop (symGrpCur, x, y);
            }
          }

          else
          {
            if (_symCur)
            {
              _symGrpCur.popup ().hide ();
              pooch.fetch (_house).css ({ cursor: "default"});
              if (_symGrpCur.layer ().toUpperCase () === "MAIN") _clearCtx (_ctxHltMain, _width, _height);
              else _clearCtx (_ctxHltBack, _width, _height);
              //else var TODO = "add swf clearing"; //document[_swfID].clearHighlights ();
            }
            _symGrpCur = null;
            _symCur    = null;
          }
        }
        else
        {
          // TODO Add mousedown behavior
        }
      }
    };

    var _frameCalc = function (symGrp, sym, key, time, dur)
    {
      var returnObj = {},
          symState  = symGrp.state ();

      if (time === 1)
      {
        var data      = symGrp.data ().datum (),
            symAttrs  = symGrp.symAttrs ();
        sym[key].list = [];

        for (var attr in symAttrs)
        {
          if (typeof symAttrs[attr] === "function") sym[key][attr] = symAttrs[attr](sym[key], data[key]);
          else sym[key][attr] = symAttrs[attr] !== null ? symAttrs[attr] : sym[key][attr];
          if (sym[key][attr] !== symState[key][attr]) sym[key].list.push (attr);
        }
      }

      var i = sym[key].list.length;

      while (i--)
      {
        var item        = sym[key].list[i],
            stepFunc    = symGrp.stepFunc (item);
        returnObj[item] = stepFunc (time, symState[key][item], sym[key][item], dur, sym[key].easing);
      }

      return returnObj;
    };

    var _shapeCalc = function (symGrp, key, attrs, ctx)
    {
      var isMap   = symGrp.map (),
          horVar  = isMap ? attrs.lng : attrs.x,
          vertVar = isMap ? attrs.lat : attrs.y,
          x       = !_wholeNums ? horVar : horVar >> 0,
          y       = !_wholeNums ? vertVar : vertVar >> 0;

      switch (attrs.shape)
      {
        case "circle":
          var size = !_wholeNums ? attrs.size : attrs.size >> 0;
          ctx.arc (x + _offsetX, y + _offsetY, size, 0, _circle, false);
        break;

        case "rect":
          var width      = !_wholeNums ? attrs.width : attrs.width >> 0,
              height     = !_wholeNums ? attrs.height : attrs.height >> 0,
              halfWidth  = !_wholeNums ? attrs.width / 2 : (attrs.width / 2) >> 0,
              halfHeight = !_wholeNums ? attrs.height / 2 : (attrs.height / 2) >> 0;
          ctx.rect (x - halfWidth + _offsetX, y - halfHeight + _offsetY, width, height);
        break;

        case "bezcurve":
          // var multiplier = (attrs["xEnd"] < x) ? true : false;
          // var firstX = (multiplier) ? x - ((x - attrs["xEnd"]) * .5) : x + ((attrs["xEnd"] - x) * .5);
          // //var secondX = (multiplier) ? attrs["xEnd"] + (attrs["xEnd"] - (x / 2)) : x + (x - (attrs["xEnd"] / 2));
          // ctx.moveTo (x, y);
          // ctx.bezierCurveTo (firstX,
          //                       y,
          //                       firstX,
          //                       attrs["yEnd"],
          //                       attrs["xEnd"],
          //                       attrs["yEnd"]);
        break;

        case "line":
          ctx.moveTo (x + _offsetX, y + _offsetX);
          var orderNdx = symGrp.datum (key).order,
              symPrev  = orderNdx > 0 ? symGrp.state (symGrp.order ()[orderNdx - 1]) : symGrp.datum (key);
          ctx.lineTo (symPrev.x + _offsetX, symPrev.y + _offsetY);

        break;

        case "hex":
          var halfWidHex  = !_wholeNums ? attrs.width / 2 : (attrs.width / 2) >> 0,
              halfHghtHex = !_wholeNums ? attrs.height / 2 : (attrs.height / 2) >> 0,
              quartWidth  = !_wholeNums ? halfWidHex / 2 : (halfWidHex / 2) >> 0;
          ctx.moveTo (x - quartWidth + _offsetX, y - halfHghtHex + _offsetY);
          ctx.lineTo (x + quartWidth + _offsetX, y - halfHghtHex + _offsetY);
          ctx.lineTo (x + halfWidHex + _offsetX, y + _offsetY);
          ctx.lineTo (x + quartWidth + _offsetX, y + halfHghtHex + _offsetY);
          ctx.lineTo (x - quartWidth + _offsetX, y + halfHghtHex + _offsetY);
          ctx.lineTo (x - halfWidHex + _offsetX, y + _offsetY);
          ctx.lineTo (x - quartWidth + _offsetX, y - halfHghtHex + _offsetY);
        break;

        case "poly":
          var polys = attrs.shapePoints,
              brds  = polys.length;

          while (brds--)
          {
            var pts = polys[brds].length - 1;
            ctx.moveTo (polys[brds][pts][0], polys[brds][pts][1]);
            while (pts--) ctx.lineTo (polys[brds][pts][0], polys[brds][pts][1]);
          }
          // if (!scope.supportsCanvas) drawString.push ("^");
        break;

        case "custom":
          var sym  = symGrp.datum (key),
              data = symGrp.data ().datum (key);
          symGrp.customShape ().process (sym, attrs, { x: _offsetX, y: _offsetY });
        break;

        default:
          var sizeDef = !_wholeNums ? attrs.size : attrs.size >> 0;
          ctx.arc (x + _offsetX, y + _offsetY, sizeDef, 0, _circle, false);
      }
    };

    var _drawCalc = function (symGrp, key, attrs, ctx, isHlt)
    {
      if (pooch.supportsCanvas)
      {
        var drawFill      = isHlt ? attrs.drawFillHighlight : attrs.drawFill,
            fillColor     = isHlt ? attrs.fillColorHighlight : attrs.fillColor,
            fillOpacity   = isHlt ? attrs.fillOpacityHighlight : attrs.fillOpacity,
            drawStroke    = isHlt ? attrs.drawStrokeHighlight : attrs.drawStroke,
            strokeWidth   = isHlt ? attrs.strokeWidthHighlight : attrs.strokeWidth,
            strokeColor   = isHlt ? attrs.strokeColorHighlight : attrs.strokeColor,
            strokeOpacity = isHlt ? attrs.strokeOpacityHighlight : attrs.strokeOpacity;

        if (drawFill) ctx.fillStyle = "rgba(" + fillColor + "," + fillOpacity + ")";

        if (drawStroke)
        {
          ctx.lineWidth = strokeWidth;
          ctx.strokeStyle = "rgba(" + strokeColor + "," + strokeOpacity + ")";
        }
        _shapeCalc (symGrp, key, attrs, ctx);
      }
    };

    var _clearLayers = function (layer, hlt)
    {
      var symLayer  = "";

      if (!layer)
      {
        var len       = _symGrp.length,
            clrMain   = false,
            clrBack   = false,
            clrHlt    = false;

        while (len--)
        {
          symLayer = _symGrp[len].layer ().toUpperCase ();

          switch (symLayer)
          {
            case "BACK":
              if (!clrBack)
              {
                clrBack = true;
                _clearCtx (_ctxBack, _width, _height);
                _clearCtx (_ctxHltBack, _width, _height);
              }
              break;

            case "MAIN":
              if (!clrMain)
              {
                clrMain = true;
                _clearCtx (_ctxMain, _width, _height);
                _clearCtx (_ctxHltMain, _width, _height);
              }
              break;

            default:
              if (!clrHlt)
              {
                clrHlt = true;
                _clearCtx (_ctxHltMain, _width, _height);
                _clearCtx (_ctxHltBack, _width, _height);
              }
          }
        }
      }
      else
      {
        symLayer = layer.toUpperCase ();
        var isHlt = hlt ? true : false,
            ctx   = isHlt ? symLayer === "HIGHLIGHTMAIN" ? _ctxHltMain : _ctxHltBack : symLayer === "MAIN" ? _ctxMain : _ctxBack;
        _clearCtx (ctx, _width, _height);
      }
    };

    var _drawSymGrps = function (time, layer, hlt)
    {
      clearTimeout (_timeOut);

      var isHlt     = hlt ? true : false,
          len       = isHlt ? 1 : _symGrp.length;
      _isAnimating  = true;

      //var drawString = [];
      if (_house)
      {
        if (pooch.supportsCanvas)
        {
          _clearLayers (layer, hlt);

        }
        else
        {
          //stepTotal = 1;
          //scope.animTickTotal = 1;
        }

        for (var i = 0; i < len; ++i)
        {
          var drawOK = (layer !== undefined && symLayer !== layer.toUpperCase ()) ? isHlt ? true : false : true;

          if (drawOK)
          {
            var sym       = isHlt ? hlt.key : _symGrp[i].datum (),
                symGrp    = isHlt ? hlt.obj : _symGrp[i],
                symOrder  = isHlt ? [pooch.helpers.keyFromObj (hlt.key)] : symGrp.order (),
                orderLen  = isHlt ? 1 : symOrder.length,
                symLayer  = symGrp.layer ().toUpperCase (),
                ctx       = isHlt ? symLayer === "MAIN" ? _ctxHltMain : _ctxHltBack : symLayer === "MAIN" ? _ctxMain : _ctxBack,
                batch     = symGrp.batch () ? true : false;

            symGrp.context (ctx);

            if (batch && !isHlt)
            {
              var batchObj = symGrp.batchObj (),
                  batchLen = batch.length;

              for (var group in batchObj)
              {
                var groupLen = batchObj[group].length;
                ctx.beginPath ();

                while (groupLen--)
                {
                  var key        = batchObj[group][groupLen],
                      attrsBatch = _frameCalc (symGrp, sym, key, _stepCnt, _stepTot);

                  for (var attrBatch in symGrp.symAttrs ()) attrsBatch[attrBatch] = attrsBatch[attrBatch] || sym[key][attrBatch];

                  _drawCalc (symGrp, key, attrsBatch, ctx, isHlt);
                }

                ctx.fill ();
                ctx.stroke ();
              }
            }

            else
            {
              for (var j = 0; j < orderLen; ++j)
              {
                ctx.beginPath ();
                var attrs = _frameCalc (symGrp, sym, symOrder[j], _stepCnt, _stepTot);
                for (var attr in symGrp.symAttrs ()) attrs[attr] = attrs[attr] || sym[symOrder[j]][attr];
                _drawCalc (symGrp, symOrder[j], attrs, ctx, isHlt);
                 var drawFill   = isHlt ? attrs.drawFillHighlight : attrs.drawFill,
                     drawStroke = isHlt ? attrs.drawStrokeHighlight : attrs.drawStroke;
                 if (drawFill) ctx.fill ();
                 if (drawStroke) ctx.stroke ();
              }
            }
          }
        }

        _stepCnt++;

        if (_stepCnt <= _stepTot && _stepTot > 1)
        {
          _timeOut = setTimeout (_drawSymGrps, 1);
        }
        else
        {
          if (!pooch.supportsCanvas)
          {
          // var returnString = drawString.join ("");
          // var drawToSWF = document[scope.swfID].drawsymbolGroup (returnString, false);
          }
          _stepCnt      = 1;
          var k         = _symGrp.length;
          while (k--) if (!isHlt) _symGrp[k].state (true);
          if (_zoomControl) _zoomControl.update ();
          _isAnimating  = false;
        }
      }
    };

    var _clearCtx = function (ctx, width, height)
    {
      if (ctx) ctx.clearRect (0, 0, width, height);
    };

    var _setUnitsPerPx = function ()
    {
      _unitsPerPx.x = (_axisMaxX - _axisMinX) / _width;
      _unitsPerPx.y = (_axisMaxY - _axisMinY) / _height;
    };

    var _setCenter = function ()
    {
      _center.x = _axisMinX + ((_axisMaxX - _axisMinX) / 2);
      _center.y = _axisMinY + ((_axisMaxY - _axisMinY) / 2);
    };

    var _assignDrag = function (domElem)
    {
      var releaseCap = false,
          drag       =
      {
        elem : null,

        init: function ()
        {
          domElem.onmousedown = drag.start;

          if (window.navigator.msPointerEnabled) // new Microsoft model
          {
            domElem.addEventListener ("MSPointerDown", drag.start, false);
            if (typeof domElem.style.msTouchAction !== "undefined") domElem.style.msTouchAction = "none";
          }
          else if (domElem.attachEvent && domElem.setCapture) // old Microsoft model
          {
            releaseCap = true;
            domElem.attachEvent ("onmousedown", function () { drag.start (window.event); window.event.returnValue = false; return false; });
          }
          else if (domElem.addEventListener)
          {
            domElem.addEventListener ("touchstart", drag.start, false); // iOS
            domElem.addEventListener ("mousedown", drag.start, false); // standard mouse
          }
        },

        start : function (e)
        {
          _isDragging = true;

          if (_symGrpCur)
          {
            var layer    = _symGrpCur.layer ().toUpperCase (),
                layerHlt = layer === "MAIN" ? "highlightMain" : "highlightBack";
            _symGrpCur.popup ().hide ();
            _clearLayers (layerHlt, true);
            _symGrpCur = _symCur = null;
          }

          drag.elem     = this;
          var parseLeft = parseInt (drag.elem.style.left, 10),
              parseTop  = parseInt (drag.elem.style.top, 10);

          if (isNaN (parseLeft)) drag.elem.style.left = "0px";
          if (isNaN (parseTop)) drag.elem.style.top = "0px";
          if (typeof window.webkitURL === "function") drag.elem.style.webkitTransform = "matrix (1, 0, 0, 1, 0, 0)";

          e                     = e ? e : window.event;
          drag.elem.mouseX      = e.clientX;
          drag.elem.mouseY      = e.clientY;

          if (window.navigator.msPointerEnabled) // new Microsoft model
          {
            document.addEventListener ("MSPointerDown", drag.start, false);
            if (typeof domElem.style.msTouchAction !== "undefined") domElem.style.msTouchAction = "none";
          }
          else if (domElem.attachEvent && domElem.setCapture) // old Microsoft model
          {
            releaseCap = true;
            document.attachEvent ("onmousemove", function () { drag.active (window.event); window.event.returnValue = false; return false; });
            document.attachEvent ("onmouseup", function () { drag.end (window.event); window.event.returnValue = false; return false; });
          }
          else if (domElem.addEventListener) // iOS, Android and standard mouse
          {
            document.addEventListener ("touchmove", drag.active, false);
            document.addEventListener ("touchend", drag.end, false);
            document.addEventListener ("touchcancel", drag.end, false);
            document.addEventListener ("touchleave", drag.end, false);

            document.addEventListener ("mousemove", drag.active, false);
            document.addEventListener ("mouseup", drag.end, false);

            if (domElem.setCapture && !window.navigator.userAgent.match (/\bGecko\b/)) releaseCap = true; // minus gecko
          }

          //target.addEventListener ("touchstart", DoEvent, false);
          return false;
        },

        active : function (e)
        {
          e.preventDefault ();
          if (drag.elem)
          {
            _isDragging   = true;
            e             = e.changedTouches ? e.changedTouches : [e];

            if (typeof window.webkitURL === "function")
            {
              var matrix = pooch.helpers.parseWebkitMatrix (drag.elem.style.webkitTransform),
                  tX     = parseInt (matrix.tX, 10) + (e[0].clientX - drag.elem.mouseX),
                  tY     = parseInt (matrix.tY, 10) + (e[0].clientY - drag.elem.mouseY);
              drag.elem.style.webkitTransform = "matrix (1, 0, 0, 1, " + tX + ", " + tY + ")";
            }
            else
            {
              var left = parseInt (drag.elem.style.left, 10) + (e[0].clientX - drag.elem.mouseX),
                  top  = parseInt (drag.elem.style.top, 10) + (e[0].clientY - drag.elem.mouseY);
              drag.elem.style.left = left + "px";
              drag.elem.style.top  = top + "px";
            }

            drag.elem.mouseX       = e[0].clientX;
            drag.elem.mouseY       = e[0].clientY;
          }
          return false;
        },

        end : function ()
        {
          if (drag.elem === null) return;
          _isDragging = false;
          var x,
              y,
              viewWid = -(_width / 3),
              viewHgt = -(_height / 3);

          if (typeof window.webkitURL === "function")
          {
            var matrix = pooch.helpers.parseWebkitMatrix (drag.elem.style.webkitTransform);
            x          = viewWid + parseInt (matrix.tX, 10);
            y          = viewHgt + parseInt (matrix.tY, 10);
          }
          else
          {
            x = parseInt (drag.elem.style.left, 10);
            y = parseInt (drag.elem.style.top, 10);
          }


          var adjX    = (x - viewWid) * (_unitsPerPx.x * 3),
              adjY    = (y - viewHgt) * (_unitsPerPx.y * 3);
          _axisMinX   -= adjX;
          _axisMaxX   -= adjX;
          _axisMinY   += adjY;
          _axisMaxY   += adjY;

          _setCenter ();

          if (x !== 0 && y !== 0)
          {
            _drawSymGrps ();
            if (typeof window.webkitURL === "function") drag.elem.style.webkitTransform = "matrix (1, 0, 0, 1, 0, 0)";
            else pooch.fetch ("#pooch_container_" + _id).css ({ "top": viewHgt + "px", "left": viewWid + "px" });
          }

          if (releaseCap) document.releaseCapture ();
          else
          {
            document.removeEventListener ("mousemove", drag.active, false);
            document.removeEventListener ("mouseup", drag.end, false);
            document.removeEventListener ("touchmove", drag.active, false);
            document.removeEventListener ("touchend", drag.end, false);
            document.removeEventListener ("touchcancel", drag.end, false);
            document.removeEventListener ("touchleave", drag.end, false);
          }

          drag.elem = null;
        }
      };

      drag.init ();
    };

    var _zoomMin = function ()
    {
      return 0;
    };

    var _zoomMax = function (val)
    {
      return _zoomLevels.length - 1;
    };

    var _fit = function (obj)
    {
      if (!arguments.length) return _chartScope;

      if (obj.val instanceof Array)
      {
        var hasProj   = _projection ? true : false,
            returnArr = [],
            brds      = obj.val.length,
            minX      = _axisMinX - (_axisMaxX - _axisMinX),
            maxX      = _axisMaxX + (_axisMaxX - _axisMinX),
            minY      = _axisMinY - (_axisMaxY - _axisMinY),
            maxY      = _axisMaxY + (_axisMaxY - _axisMinY);

        while (brds--)
        {
          var pts  = obj.val[brds].length;
          returnArr[brds] = [];
          var initial   = true;

          while (pts--)
          {
            returnArr[brds][pts]    = [];
            var x                   = obj.val[brds][pts][0],
                y                   = obj.val[brds][pts][1],
                proj                = hasProj ? _projection (x, y, initial) : { x: x, y: y },
                locX                = _width * ((proj.x - minX) / (maxX - minX)),
                locY                = _height - (_height * ((proj.y - minY) / (maxY - minY)));

            returnArr[brds][pts][0] = !_wholeNums ? locX : locX >> 0;
            returnArr[brds][pts][1] = !_wholeNums ? locY : locY >> 0;
            initial = false;
          }
        }
        return returnArr;
      }
      else
      {
        var isWidth = obj.dim === "width",
            dim     = isWidth ? _width : _height,
            valWid  = _axisMaxX - _axisMinX,
            valHgt  = _axisMaxY - _axisMinY,
            min     = isWidth ? _axisMinX - valWid : _axisMinY - valHgt,
            max     = isWidth ? _axisMaxX + valWid : _axisMaxY + valHgt,
            loc;
        if (isWidth) loc = dim * ((obj.val - min) / (max - min));
        else loc = dim - (dim * ((obj.val - min) / (max - min)));
        return loc;
      }
      return _chartScope;
    };

    _chartScope.bounds = function (arr)
    {
      //TODO get this working for a symbol object that is not a shape, and also set the _bound var
      if (!arguments.length) return _bounds;
      if (arr.length)
      {
        _chartScope.axisMinX (arr[3]);
        _chartScope.axisMaxX (arr[1]);
        _chartScope.axisMinY (arr[2]);
        _chartScope.axisMaxY (arr[0]);
        _axisDefaults = { minX: arr[3], maxSetX: arr[1], minY: arr[2], maxY: arr[0] };
        _setUnitsPerPx ();
        _setCenter ();
      }
      else
      {
        var shapePts    = arr.data ().datum (),
            numMax      = Number.MAX_VALUE,
            numMin      = Number.MIN_VALUE,
            bndsW       = numMax,
            bndsS       = numMax,
            bndsE       = numMin,
            bndsN       = numMin;

        for (var shape in shapePts)
        {
          var poly = shapePts[shape][arr.shapeData ()],
              brds = poly ? poly.length : 0;

          while (brds--)
          {
            var pts = poly[brds].length;

            while (pts--)
            {
              var origX = poly[brds][pts][0],
                  origY = poly[brds][pts][1];
              if (origX < bndsW) bndsW = origX;
              if (origX > bndsE) bndsE = origX;
              if (origY > bndsN) bndsN = origY;
              if (origY < bndsS) bndsS = origY;
            }
          }
        }
        var chartRatio = _height / _width,
            shapeRatio = Math.abs (bndsN - bndsS) / Math.abs (bndsE - bndsW);
        if (chartRatio < shapeRatio)
        {
          var adjHgt  = (bndsE - bndsW) * (shapeRatio - chartRatio),
              halfHgt = adjHgt / 2;
          bndsW -= halfHgt;
          bndsE += halfHgt;
        }
        else if (shapeRatio < chartRatio)
        {
          var adjWid  = (bndsN - bndsS) * (chartRatio - shapeRatio),
              halfWid = adjWid / 2;
          bndsS -= halfWid;
          bndsN += halfWid;
        }
        _chartScope.axisMinX (bndsW);
        _chartScope.axisMaxX (bndsE);
        _chartScope.axisMinY (bndsS);
        _chartScope.axisMaxY (bndsN);
        _axisDefaults = { minX: bndsW, maxX: bndsE, minY: bndsS, maxY: bndsN };
        _setUnitsPerPx ();
        _setCenter ();
      }
      return _chartScope;
    };

    _chartScope.symbolGroup = function (obj)
    {
      if (!arguments.length) return _symGrp;

      var len         = obj.length,
          chartActive = false;

      for (var i = 0; i < len; ++i)
      {
        _symGrp[i] =  (obj[i]);
        _symGrp[i].chart (_chartScope, _fit);
        _symGrp[i].state (true);

        if (_house)
        {
          if (_symGrp[i].popup ()) _popHouse (_symGrp[i].popup ().house);
          if (!chartActive && _symGrp[i].interactive ())
          {
            _chartScope.mouseMove (_mouseMoveChart);
            _chartScope.mouseOut (_mouseMoveChart);
            chartActive = true;
          }
        }
        else
        {
          _funcQueue.push ( { func: _popHouse, arg: _symGrp[i].popup ().house } );
          _funcQueue.push ( { func: _chartScope.mouseMove, arg: _mouseMoveChart } );
          _funcQueue.push ( { func: _chartScope.mouseOut, arg: _mouseMoveChart } );
        }
      }
      return _chartScope;
    };

    _chartScope.width = function (val)
    {
      if (!arguments.length) return _width / 3;
      _width = val * 3;
      if (_house)
      {
        _adjustLayout ({ width: _width });
        _cvsHidden.width        = _width;
        _cvsHidden.style.width  = _width + "px";
      }
      else _funcQueue.push ( { func: _adjustLayout, arg: { width: _width } } );
      return _chartScope;
    };

    _chartScope.height = function (val)
    {
      if (!arguments.length) return _height / 3;
      _height = val * 3;
      if (_house)
      {
        _adjustLayout ({ height: _height });
        _cvsHidden.height       = _height;
        _cvsHidden.style.height = _height + "px";
      }
      else _funcQueue.push ( { func: _adjustLayout, arg: { height: _height } } );
      return _chartScope;
    };

    _chartScope.axisMinX = function (val)
    {
      if (!arguments.length) return _axisMinX;
      _axisMinX = val;
      return _chartScope;
    };

    _chartScope.axisMaxX = function (val)
    {
      if (!arguments.length) return _axisMaxX;
      _axisMaxX = val;
      return _chartScope;
    };

    _chartScope.axisMinY = function (val)
    {
      if (!arguments.length) return _axisMinY;
      _axisMinY = val;
      return _chartScope;
    };

    _chartScope.axisMaxY = function (val)
    {
      if (!arguments.length) return _axisMaxY;
      _axisMaxY = val;
      return _chartScope;
    };

    _chartScope.projection = function (func)
    {
      if (!arguments.length) return _projection;
      if (func === null) _projection = null;
      if (typeof func === "function") _projection = func;
      return _chartScope;
    };

    _chartScope.reset = function ()
    {
      _axisMinX = _axisDefaults.minX;
      _axisMaxX = _axisDefaults.maxX;
      _axisMinY = _axisDefaults.minY;
      _axisMaxY = _axisDefaults.maxY;
      _setCenter ();
      _chartScope.zoom (0);
      return _chartScope;
    };

    _chartScope.zoomControl = function (obj)
    {
      if (!arguments.length) return _zoomControl;
      _zoomControl = obj;
      _zoomControl.target (_chartScope, _zoomMin, _zoomMax);
      _house.appendChild (_zoomControl.domElem ());
      _zoomControl.house (_house);
      _assignDrag (pooch.fetch ("#pooch_container_" + _id). dom ());
      _zoomControl.update ();
      return _chartScope;
    };

    _chartScope.zoomIn = function ()
    {
      if (_house) if (_zoom + 1 < _zoomLevels.length) _chartScope.zoom (_zoom + 1);
      return _chartScope;
    };

    _chartScope.zoomOut = function ()
    {
      if (_house)
      {
        if (_zoom - 1 === 0) _chartScope.reset ();
        else if (_zoom - 1 >= 0) _chartScope.zoom (_zoom - 1);
      }
      return _chartScope;
    };

    _chartScope.zoom = function (val)
    {
      if (!arguments.length) return _zoom;
      _zoom = val;
      // TODO Tidy this up
      _axisMinX = _center.x - ((_axisDefaults.maxX - _axisDefaults.minX) / 2) / _zoomLevels[_zoom];
      _axisMaxX = _center.x + ((_axisDefaults.maxX - _axisDefaults.minX) / 2) / _zoomLevels[_zoom];
      _axisMinY = _center.y - ((_axisDefaults.maxY - _axisDefaults.minY) / 2) / _zoomLevels[_zoom];
      _axisMaxY = _center.y + ((_axisDefaults.maxY - _axisDefaults.minY) / 2) / _zoomLevels[_zoom];
      _setCenter ();
      _setUnitsPerPx ();
      _drawSymGrps ();
      return _chartScope;
    };

    _chartScope.zoomLevels = function (arr)
    {
      if (!arguments.length) return _zoomLevels;
      _zoomLevels = arr;
      return _chartScope;
    };

    _chartScope.draw = function (count, layer)
    {
      _stepCnt = 1;
      if (!arguments.length) _stepTot = 1;
      else _stepTot = count;

      if (_house) _drawSymGrps (count, layer);
      else _funcQueue.push ( { func: _drawSym, arg: null } );
      return _chartScope;
    };

    _chartScope.mouseIgnore = function (bool)
    {
      if (!arguments.length) return _mouseIgnore;
      _mouseIgnore = bool;
      return _chartScope;
    };

    _chartScope.mouseMove = function (func)
    {
      if (typeof func === "function")
      {
        var checkParams = function (e) { var ignore = function () { return _isAnimating || _isDragging || _mouseIgnore; } (); func (e, ignore); };
        if (_house) pooch.fetch ("#pooch_mouse_" + _id).mouseMove (checkParams);
        else _funcQueue.push ( { func: func, arg: checkParams } );
      }
      return _chartScope;
    };

    _chartScope.mouseOver = function (func)
    {
      if (typeof func === "function")
      {
        if (_house) pooch.fetch ("#pooch_mouse_" + _id).mouseOver (func);
        else _funcQueue.push ( { func: _chartScope.mouseOver, arg: func } );
      }
      return _chartScope;
    };

    _chartScope.mouseDown = function (func)
    {
      if (typeof func === "function")
      {
        if (_house) pooch.fetch ("#pooch_mouse_" + _id).mouseDown (func);
        else _funcQueue.push ( { func: _chartScope.mouseDown, arg: func } );
      }
      return _chartScope;
    };

    _chartScope.mouseOut = function (func)
    {
      if (typeof func === "function")
      {
        var checkParams = function (e) { _mouseMoveChart ({ localX: -20000, localY: -20000 }); };
        if (_house) pooch.fetch ("#pooch_mouse_" + _id).mouseOut (checkParams);
        else _funcQueue.push ( { func: _chartScope.mouseOut, arg: func } );
      }
      return _chartScope;
    };

    _chartScope.activeSymbol = function (obj)
    {
      if (!arguments.length) return _symCur;
      _symCur = obj;
      return _chartScope;
    };


    _chartScope.house = function (elem)
    {
      if (!arguments.length) return _house;
      var house = pooch.fetch (elem). dom ();

      if (house)
      {
        _house = house;
        var layout    = [],
            closeElem = "",
            ndxPre    = _layersPre.length,
            ndxMain   = _layersMain.length,
            ndxPost   = _layersPost.length;

        while (ndxPre--)
        {
          var keyPre = pooch.helpers.keyFromObj (_layersPre[ndxPre]);
          closeElem = _layersPre[ndxPre][keyPre];
          layout.push ("<" + _layersPre[ndxPre][keyPre] + " id='pooch" + keyPre + "_" +
                      _id + "' width='" + _width + "' height='" + _height +
                      "' style='position:relative;top:0;left:0;width:" +
                      _width + "px;height:" + _height + "px;'>");
        }

        if (pooch.supportsCanvas)
        {
          while (ndxMain--)
          {
            var keyMain = pooch.helpers.keyFromObj (_layersMain[ndxMain]);
            layout.push ("<" + _layersMain[ndxMain][keyMain] + " id='pooch" + keyMain + "_" +
                        _id + "' width='" + _width + "' height='" + _height +
                        "' style='position:absolute;top:0;left:0;width:" +
                        _width + "px;height:" + _height + "px;'></" + _layersMain[ndxMain][keyMain] + ">");

          }
          _cvsHidden              = document.createElement ('canvas');
          _cvsHidden.id           = "poochCvsHidden_" + _id;
          _cvsHidden.width        = _width;
          _cvsHidden.height       = _height;
          _cvsHidden.style.width  = _width + "px";
          _cvsHidden.style.height = _height + "px";
          _ctxHidden              = _cvsHidden.getContext ("2d");
        }
        else
        {
          // TODO add non-canvas layout
        }

        while (ndxPost--)
        {
          var keyPost = pooch.helpers.keyFromObj (_layersPost[ndxPost]);
          layout.push ("<" + _layersPost[ndxPost][keyPost] + " id='pooch" + keyPost + "_" +
                      _id + "' width='" + _width + "' height='" + _height +
                      "' style='position:absolute;top:0;left:0;width:" +
                      _width + "px;height:" + _height + "px;'></" + _layersPost[ndxPost][keyPost] + ">");
        }

        layout.push ("</" + closeElem + ">");
        var join         = layout.join ("");
        _house.innerHTML = join;
        _ctxBack         = pooch.fetch ("#pooch_back_" + _id).dom ().getContext ("2d");
        _ctxMain         = pooch.fetch ("#pooch_main_" + _id).dom ().getContext ("2d");
        _ctxHltMain      = pooch.fetch ("#pooch_highlightMain_" + _id).dom ().getContext ("2d");
        _ctxHltBack      = pooch.fetch ("#pooch_highlightBack_" + _id).dom ().getContext ("2d");
        _id              = "chart" + _chartNdx++;

        var qLen = _funcQueue.length;

        while (qLen--)
        {
          _funcQueue[qLen].func (_funcQueue[qLen].arg);
        }
        _funcQueue = [];
      }
      return _chartScope;
    };

    if (!arguments.length || id === undefined) return _chartScope;
    _chartScope.house (id);
    return _chartScope;
  };

  _symbolGroup = function (shape)
  {
    var _symGrpScope = this;

    var _stepInt = function (time, sPos, ePos, dur, ease)
    {
      var change = ePos - sPos;

      if (!dur || dur === 1 || time === dur) return ePos;
      switch (ease) //Based on Robert Penner's Easing Functions
      {
        case "linear":
          return sPos + (change * (time / dur));
        case "easeIn":
          return change * (time /= dur) * time * time + sPos;
        case "easeOut":
          return change * ((time = time / dur - 1) * time * time + 1) + sPos;
        case "easeInOut":
          if ((time /= dur / 2) < 1) return change / 2 * time * time * time + sPos;
          return change / 2 * ((time -= 2) * time * time + 2) + sPos;
        default:
          return sPos + (change * (time / dur));
      }
    };

    var _stepSwitch = function (time, sVal, eVal, dur, ease)
    {
      return eVal;
    };

    var _stepPoints = function (time, sPts, ePts, dur, ease)
    {
      return ePts;
    };

    var _stepColor = function (time, sCol, eCol, dur, ease)
    {
      if (!dur || dur === 1 || time === dur) return eCol;
      var sColSpl   = sCol.split (","),
          eColSpl   = eCol.split (","),
          interpR   = _stepInt (time, sColSpl[0]|0, eColSpl[0]|0, dur, ease) >> 0,
          interpG   = _stepInt (time, sColSpl[1]|0, eColSpl[1]|0, dur, ease) >> 0,
          interpB   = _stepInt (time, sColSpl[2]|0, eColSpl[2]|0, dur, ease) >> 0;

      return interpR + "," + interpG + "," + interpB;
    };

    var _setLat = function (val)
    {
      var latID = val + "_pooch_proj_y";
      for (var obj in _info.datum ())
      {
        _info.datum ()[obj][latID] = pooch.helpers.latToMercator (_info.datum ()[obj][val]);
      }
      _attrs.lat = function (sym, data) { return _fitFunc ({ dim:"height", val: data[latID] }); };
    };

    var _setLng = function (val)
    {
      var lngID = val + "_pooch_proj_x";
      for (var obj in _info.datum ())
      {
        _info.datum ()[obj][lngID] = pooch.helpers.lngToMercator (_info.datum ()[obj][val]);
      }
      _attrs.lng = function (sym, data) { return _fitFunc ({ dim:"width", val: data[lngID] }); };
    };

    var _makeBatch = function ()
    {
      _batchObj = {};

      for (var sym in _symGrp)
      {
        var fillColor =  typeof _symGrpScope.fillColor () === "string" ? _symGrpScope.fillColor () : _symGrpScope.fillColor ()(_symGrp[sym], _info.datum ()[sym]);
        if (_batchObj.hasOwnProperty (fillColor)) _batchObj[fillColor].push (_symGrp[sym].poochID);
        else  _batchObj[fillColor] = [_symGrp[sym].poochID];
      }
      return _batchObj;
    };

    var _build = function (arr)
    {
      if (!arguments.length) return _symGrpScope;
      var keyLen = arr.length;
      _symGrp    = {};

      while (keyLen--)
      {
        var key = arr[keyLen];
        _symGrp[key] = {};

        for (var attr in _attrs)
        {
          _symGrp[key][attr] = _attrs[attr];
        }
        _symGrp[key].poochID     = key;
        _order[keyLen]           = key;
        _symGrp[key].order       = keyLen;
      }
      return _symGrpScope;
    };

    var _assignAttrs = function (attr, val)
    {
      if (arguments.length === 1) return _attrs[attr];
      if (_dataObjExists (val)) attr = function (sym, data) { return data[val]; };
      else _attrs[attr] = val;
      return _symGrpScope;
    };

    var _dataObjExists = function (val)
    {
      var firstKey = null;
      for (var first in _symGrpScope.state ())
      {
        firstKey = first;
        break;
      }
      return (typeof val === "string" && typeof _info.datum (firstKey)[val]  !== "undefined");
    };

    _symGrpScope.sort = function ()
    {
      if (_info)
      {
        //TODO add calculations for objects other than circles
        if (typeof _attrs.size === "function")
        {
          _order.sort (function (a, b)
          {
            var sizeA = _attrs.size (_symGrp[a], _info.datum (_symGrp[a].poochID));
                sizeB = _attrs.size (_symGrp[b], _info.datum (_symGrp[b].poochID));
            var compare = _symGrp[b].shape === "circle" ? sizeB - sizeA : (_symGrp[b].height * _symGrp[b].width) - (_symGrp[a].height * _symGrp[a].width);
            return sizeB - sizeA;
          });
        }
      }
      return _symGrpScope;
    };

    _symGrpScope.data = function (obj)
    {
      if (!arguments.length) return _info;
      _info = obj;
      _build (_info.keys ());
      var qLen = _funcQueue.length;

      while (qLen--)
      {
        _funcQueue[qLen].func (_funcQueue[qLen].arg);
      }
      _funcQueue = [];

      return _symGrpScope;
    };

    _symGrpScope.batch = function (bool)
    {
      if (!arguments.length) return _batch;
      _batch = bool;
      return _symGrpScope;
    };

    _symGrpScope.chart = function (obj, func)
    {
      if (!arguments.length) return _chart;
      _chart = obj;
      _fitFunc = func;
      return _symGrpScope;
    };

    _symGrpScope.symAttrs = function (obj)
    {
      if (!arguments.length) return _attrs;
      for (var attr in obj) { _attr[attr] = obj[attr]; }
      return _symGrpScope;
    };

    _symGrpScope.datum = function (key)
    {
      if (!arguments.length) return _symGrp;
      return _symGrp[key];
    };

    _symGrpScope.stepFunc = function (key)
    {
      if (!arguments.length) return _stepFunc;
      return _stepFunc[key];
    };

    _symGrpScope.popup = function (obj)
    {
      if (!arguments.length) return _pop;
      _pop = obj;
      _pop.data (_symGrpScope, _info);
      _interactive = true;
      return _symGrpScope;
    };

    _symGrpScope.drawFill               = function (val) { return _assignAttrs ("drawFill", val); };
    _symGrpScope.drawStroke             = function (val) { return _assignAttrs ("drawStroke", val); };
    _symGrpScope.drawFillHighlight      = function (val) { return _assignAttrs ("drawFillHighlight", val); };
    _symGrpScope.fillColorHighlight     = function (val) { return _assignAttrs ("fillColorHighlight", val); };
    _symGrpScope.fillOpacityHighlight   = function (val) { return _assignAttrs ("fillOpacityHighlight", val); };
    _symGrpScope.drawStrokeHighlight    = function (val) { return _assignAttrs ("drawStrokeHighlight", val); };
    _symGrpScope.strokeWidthHighlight   = function (val) { return _assignAttrs ("strokeWidthHighlight", val); };
    _symGrpScope.strokeColorHighlight   = function (val) { return _assignAttrs ("strokeColorHighlight", val); };
    _symGrpScope.strokeOpacityHighlight = function (val) { return _assignAttrs ("strokeOpacityHighlight", val); };
    _symGrpScope.size                   = function (val) { return _assignAttrs ("size", val); };
    _symGrpScope.fillOpacity            = function (val) { return _assignAttrs ("fillOpacity", val); };
    _symGrpScope.strokeOpacity          = function (val) { return _assignAttrs ("strokeOpacity", val); };
    _symGrpScope.strokeColor            = function (val) { return _assignAttrs ("strokeColor", val); };
    _symGrpScope.strokeWidth            = function (val) { return _assignAttrs ("strokeWidth", val); };

    _symGrpScope.shapeData = function (val)
    {
      if (!arguments.length) return _shapeData;
      if (typeof val === "string") _shapeData = val;
      return _symGrpScope;
    };

    _symGrpScope.shape = function (val)
    {
      if (!arguments.length) return _attrs.shape;
      _attrs.shape = val;
      return _symGrpScope;
    };

    _symGrpScope.order = function (val)
    {
      if (!arguments.length) return _order;
      _order = val;
      return _symGrpScope;
    };

    _symGrpScope.layer = function (val)
    {
      if (!arguments.length) return _layer;
      _layer = val;
      return _symGrpScope;
    };

    _symGrpScope.easing = function (val)
    {
      if (!arguments.length) return _attrs.easing;
      _attrs.easing = val;
      return _symGrpScope;
    };

    _symGrpScope.fillColor = function (val)
    {
      if (!arguments.length) return _attrs.fillColor;
      _attrs.fillColor = val;
      _batchMod = true;
      return _symGrpScope;
    };

    _symGrpScope.width = function (val)
    {
      if (!arguments.length) return _attrs.width;
      if (typeof val === "string")
      {
        _fitVarX = val;
        _attrs.width = function (sym, data) { return data[val]; };
      }
      else _attrs.width = val;
      return _symGrpScope;
    };

    _symGrpScope.height = function (val)
    {
      if (!arguments.length) return _attrs.height;
      if (typeof val === "string")
      {
        _fitVarY = val;
        _attrs.height = function (sym, data) { return data[val]; };
      }
      else _attrs.height = val;
      return _symGrpScope;
    };

    _symGrpScope.interactive = function (bool)
    {
      if (!arguments.length) return _interactive;
      _interactive = bool;
      return _symGrpScope;
    };

    _symGrpScope.map = function (val)
    {
      if (!arguments.length) return _map;
      _map = val;
      return _symGrpScope;
    };

    _symGrpScope.context = function (ctx)
    {
      if (!arguments.length) return _ctx;
      _ctx = ctx;
      return _symGrpScope;
    };

    _symGrpScope.customShape = function (func)
    {
      if (!arguments.length) return _customShape;
      _customShape = func;
      return _symGrpScope;
    };

    _symGrpScope.batchObj = function (obj)
    {
      if (!arguments.length)
      {
        if (_batchMod)
        {
          _batchObj = _makeBatch ();
          _batchMod = false;
        }
        return _batchObj;
      }

      _batchObj = obj;
      return _symGrpScope;
    };

    _symGrpScope.x = function (val)
    {
      if (!arguments.length) return _attrs.x;
      if (_dataObjExists (val))
      {
        _fitVarX = val;
        _attrs.x = function (sym, data) { return _fitFunc ({ dim: "width", val: data[_fitVarX] }); };
      }
      else _attrs.x = function () { return _fitFunc ({ dim: "width", val: val }); };
      return _symGrpScope;
    };

    _symGrpScope.y = function (val)
    {
      //TODO See if the lack of _fitVarY is messing up the bounds method in chart
      if (!arguments.length) return _attrs.y;
      if (_dataObjExists (val))
      {
        _fitVarY = val;
        _attrs.y = function (sym, data) { return _fitFunc ({ dim:"height", val: data[val] }); };
      }
      else _attrs.y = function () { return _fitFunc ({ dim: "height", val: val }); };
      return _symGrpScope;
    };

    _symGrpScope.lat = function (val)
    {
      if (!arguments.length) return _attrs.lat;
      if (typeof val === "string")
      {
        if (_info) _setLat (val);
        else _funcQueue.push ( { func: _setLat, arg: val } );
      }
      else _attrs.lat = pooch.helpers.latToMercator (val);
      return _symGrpScope;
    };

    _symGrpScope.lng = function (val)
    {
      if (!arguments.length) return _attrs.lng;
      if (typeof val === "string")
      {
        if (_info) _setLng (val);
        else _funcQueue.push ( { func: _setLng, arg: val } );
      }
      else _attrs.lng = pooch.helpers.lngToMercator (val);
      return _symGrpScope;
    };

    _symGrpScope.shapePoints = function (val)
    {
      if (!arguments.length) return _attrs.shapePoints;
      if (typeof val === "string")
      {
        _symGrpScope.shapeData (val);
        if (_info) _attrs.shapePoints = function (sym, data) { return _fitFunc ({sym: sym, val: data[val] }); };  //boundsObj: _boundsInView,
        else _funcQueue.push ( { func: _symGrpScope.shapePoints, arg: val } );
      }
      else _attrs.shapePoints = val;
      return _symGrpScope;
    };

    _symGrpScope.state = function (str)
    {
      if (!arguments.length) return _symState;
      else if (arguments.length === 1 && typeof _symState[str] !== "undefined") return _symState[str];

      for (var obj in _symGrp)
      {
        _symState[obj] = {};

        for (var attr in _attrs)
        {
          _symState[obj][attr] = _symGrp[obj][attr];
        }

        _symState[obj].poochID = obj;
        //console.log ("ssffd");
      }

      return _symState;
    };

    var _symGrp      = {},
        _bounds      = [Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, Number.MAX_VALUE],
        //_boundsInView = {},
        _info        = null,
        _pop         = null,
        _ctx         = null,
        _order       = [],
        _layer       = "main",
        _popup       = null,
        _unit        = "integer",
        _chart       = null,
        _fitFunc     = null,
        _batch       = false,
        _batchMod    = false,
        _customShape = null,
        _batchObj    = {},
        _interactive = false,
        _map         = null,
        _fitVarX     = null,
        _fitVarY     = null,
        _shapeData   = "",
        _funcQueue   = [],
        _symState    = {},
        _attrs       = { symbolGroup: _symGrpScope, x: 0, y: 0, lat: 0, lng: 0, visible: true, shape: "circle",
                        easing: "easeInOut", drawFill: true, drawStroke: true,
                        size: 6, height: 6, width: 6, fillColor: "200,200,200",
                        fillOpacity: 1, strokeColor: "255,255,255",
                        strokeOpacity: 1, strokeWidth: 1, shapePoints: [],
                        drawFillHighlight: true, fillColorHighlight: "200,200,200", fillOpacityHighlight: 1,
                        drawStrokeHighlight: true, strokeWidthHighlight: 1, strokeColorHighlight: "0,0,0",
                        strokeOpacityHighlight: 1 },
        _stepFunc    = { symbolGroup: _stepSwitch, poochID: _stepSwitch, order: _stepSwitch, x: _stepInt, y: _stepInt,
                        lat: _stepInt, lng: _stepInt, visible: _stepSwitch, shape: _stepSwitch,
                        easing: _stepSwitch, drawFill: _stepSwitch, drawStroke: _stepSwitch,
                        size: _stepInt, height: _stepInt, width: _stepInt, fillColor: _stepColor,
                        fillOpacity: _stepInt, strokeColor: _stepColor,
                        strokeOpacity: _stepInt, strokeWidth: _stepInt, shapePoints: _stepPoints,
                        drawFillHighlight: _stepSwitch, fillColorHighlight: _stepSwitch, fillOpacityHighlight: _stepSwitch,
                        drawStrokeHighlight: _stepSwitch, strokeWidthHighlight: _stepSwitch, strokeColorHighlight: _stepSwitch,
                        strokeOpacityHighlight: _stepSwitch };

    if (!arguments.length) return _symGrpScope;
    _symGrpScope.shape (shape);
    return _symGrpScope;
  };

  _zoomControl= function (elem)
  {
    var _zoomScope   = this,
        _template    = null,
        _domElem     = null,
        _target      = null,
        _house       = null,
        _reset       = null,
        _zoomIn      = null,
        _zoomOut     = null,
        _handle      = null,
        _slider      = null,
        _zoomMinFunc = null,
        _zoomMaxFunc = null,
        _top         = 0,
        _left        = 0,
        _funcQueue   = [];

    var _attachElem = function (func, elem)
    {
      if (_house)
      {
        var dom = pooch.fetch (elem).dom ();
        if (dom) return dom;
      }
      else _funcQueue.push ( { func: func, arg: elem } );
      return null;
    };

    var _triggerReset = function (e)
    {
      _target.reset ();
    };

    var _triggerZoomIn = function (e)
    {
      _target.zoomIn ();
    };

    var _triggerZoomOut = function (e)
    {
      _target.zoomOut ();
    };

    var _triggerHandle = function (e)
    {
      //_target.zoomIn ();
    };

    var _triggerSlider = function (e)
    {
      //_target.zoomIn ();
    };

    _zoomScope.house = function (elem)
    {
      if (!arguments.length) return _house;
      var house = pooch.fetch (elem).dom ();

      if (house)
      {
        _house = house;
        _house.appendChild (_domElem);
      }

      var qLen = _funcQueue.length;

      while (qLen--)
      {
        _funcQueue[qLen].func (_funcQueue[qLen].arg);
      }
      _funcQueue = [];

      if (_reset) pooch.fetch (_reset).mouseDown (_triggerReset);
      if (_zoomIn) pooch.fetch (_zoomIn).mouseDown (_triggerZoomIn);
      if (_zoomOut) pooch.fetch (_zoomOut).mouseDown (_triggerZoomOut);
      if (_handle) pooch.fetch (_handle).mouseDown (_triggerHandle);
      if (_slider) pooch.fetch (_slider).mouseDown (_triggerSlider);

      return _zoomScope;
    };

    _zoomScope.domElem = function (obj)
    {
      if (!arguments.length) return _domElem;
      _domElem = obj;
      return _zoomScope;
    };

    _zoomScope.target = function (obj, zoomMinFunc, zoomMaxFunc)
    {
      if (!arguments.length) return _target;
      _target = obj;
      if (zoomMinFunc !== null) _zoomMinFunc  = zoomMinFunc;
      if (zoomMaxFunc !== null) _zoomMaxFunc  = zoomMaxFunc;
      return _zoomScope;
    };

    _zoomScope.reset = function (elem)
    {
      if (!arguments.length) return _reset;
      _reset = _attachElem (_zoomScope.reset, elem);
      return _zoomScope;
    };

    _zoomScope.zoomIn = function (elem)
    {
      if (!arguments.length) return _zoomIn;
      _zoomIn = _attachElem (_zoomScope.zoomIn, elem);
      return _zoomScope;
    };

    _zoomScope.zoomOut = function (elem)
    {
      if (!arguments.length) return _zoomOut;
      _zoomOut = _attachElem (_zoomScope.zoomOut, elem);
      return _zoomScope;
    };

    _zoomScope.handle = function (elem)
    {
      if (!arguments.length) return _handle;
      _handle = _attachElem (_zoomScope.handle, elem);
      return _zoomScope;
    };

    _zoomScope.slider = function (elem)
    {
      if (!arguments.length) return _slider;
      _slider = _attachElem (_zoomScope.slider, elem);
      return _zoomScope;
    };

    _zoomScope.top = function (val)
    {
      if (!arguments.length) return _top;
      _top = val;
      pooch.fetch (_domElem).css ( {top: _top + "px"} );
      return _zoomScope;
    };

    _zoomScope.left = function (val)
    {
      if (!arguments.length) return _left;
      _left = val;
      pooch.fetch (_domElem).css ( {left: _left + "px"} );
      return _zoomScope;
    };

    _zoomScope.update = function ()
    {
      var zoomMin   = _zoomMinFunc !== null ? _zoomMinFunc () : _target.zoomMin (),
          zoomMax   = _zoomMaxFunc !== null ? _zoomMaxFunc () : _target.zoomMax (),
          steps     = zoomMax - zoomMin,
          stepDist  = parseInt (pooch.fetch (_slider).css ("height"), 10) / steps,
          yPos      = ((zoomMax - _target.zoom ()) * stepDist) >> 0;
      pooch.fetch (_handle).css ({ top: yPos + "px" });
      return _zoomScope;
    };

    if (!arguments.length) return _zoomScope;

    if (typeof elem === "string" &&
        document.getElementById (elem) !== null &&
        document.getElementById (elem) !== undefined)
    {
      _template = document.getElementById (elem);
      _domElem  = document.createElement ('div');
      _domElem.style.borderStyle = 'none';
      _domElem.style.borderWidth = '0px';
      _domElem.style.position = 'absolute';
      _domElem.style.display = 'block';
      _domElem.innerHTML = _template.innerHTML;
      _zoomScope.domElem (_domElem);

    }

    return _zoomScope;

  };

  _popup = function (elem)
  {
    var _popupScope = this,
        _domElem    = null,
        _template   = null,
        _house      = null,
        _info       = null,
        _symGrp        = null,
        _x          = 0,
        _y          = 0,
        _offsetX    = 0,
        _offsetY    = 24,
        _width      = 0,
        _height     = 0;

    _popupScope.house = function (elem)
    {
      if (!arguments.length) return _house;
      var house = pooch.fetch (elem).dom ();
      if (house)
      {
        _house = house;
        _house.appendChild (_domElem);
      }
      return _popupScope;
    };

    _popupScope.width = function (val)
    {
      if (!arguments.length) return _width;
      _width = val;
      //pooch.fetch (_domElem).css ( {width: _width + "px"} );
      return _popupScope;
    };

    _popupScope.height = function (val)
    {
      if (!arguments.length) return _height;
      _height = val;
      pooch.fetch (_domElem).css ( {height: _height + "px"} );
      return _popupScope;
    };

    _popupScope.offsetX = function (val)
    {
      if (!arguments.length) return _offsetX;
      _offsetX = val;
      return _popupScope;
    };

    _popupScope.offsetY = function (val)
    {
      if (!arguments.length) return _offsetY;
      _offsetY = val;
      return _popupScope;
    };

    _popupScope.x = function (val)
    {
      if (!arguments.length) return _x;
      _x = val;
      pooch.fetch (_domElem).css ( {left: _x + "px"} );
      return _popupScope;
    };

    _popupScope.y = function (val)
    {
      if (!arguments.length) return _y;
      _y = val;
      pooch.fetch (_domElem).css ( {top: _y + "px"} );
      return _popupScope;
    };

    _popupScope.hide = function ()
    {
      pooch.fetch (_domElem).css ( {top: "-3000px", left: "-3000px"} );
      return _popupScope;
    };

    _popupScope.layout = function (obj)
    {
      if (!arguments.length) return _domElem.innerHTML;

      var text       = _template.innerHTML,
          replace    = [{ text: new RegExp (/exec(\s*)\{(.*?)\}/g), chunk: new RegExp (/\{(.*?)\}/), js: true, obj: false },
                        { text: new RegExp (/data\.(.*?)[^a-zA-Z0-9_]/g), chunk: new RegExp (/\.(.*?)[^a-zA-Z0-9_]/), js: false, obj: true },
                        { text: new RegExp (/data(\s*)\[(.*?)\]/g), chunk: new RegExp (/\[(.*?)\]/), js: true, obj: true },
                        { text: new RegExp (/sym\.(.*?)[^a-zA-Z0-9_]/g), chunk: new RegExp (/\.(.*?)[^a-zA-Z0-9_]/), js: false, obj: true },
                        { text: new RegExp (/sym(\s*)\[(.*?)\]/g), chunk: new RegExp (/\[(.*?)\]/), js: true, obj: true }],
          i          = replace.length;

      while (i--)
      {
        var matches = text.match (replace[i].text),
            j       = matches ? matches.length : 0;

        while (j--)
        {
          var prop      = replace[i].chunk.exec (matches[j])[1].replace (/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace (/\s+/g,' '),
              preDotLen = matches[0].substr (0, 3) === "dat" ? 5 : matches[0].substr (0, 3) === "sym" ? 3 : 0,
              append    = (!replace[i].js) ? matches[j].substr (preDotLen, matches[j].length).match (/[^a-zA-Z0-9_]/) : "",
              val       = replace[i].js ? replace[i].obj ? preDotLen === 5 ? _info.datum ()[obj][eval (prop)] : _sym.datum ()[obj][eval (prop)] : eval (prop) : preDotLen === 5 ? _info.datum ()[obj][prop] : _sym.datum ()[obj][prop],
              appendVal = val + append;
          text          = text.replace (matches[j], appendVal);
        }
      }


      _popupScope.hide ();
      _domElem.innerHTML = text;
      _popupScope.width (_domElem.clientWidth);
      _popupScope.height (_domElem.clientHeight);

      return _popupScope;
    };

    _popupScope.data = function (symGrp, data)
    {
      if (!arguments.length) return _info;
      if (symGrp !== null && symGrp !== undefined) _symGrp = symGrp;
      if (data !== null && data !== undefined) _info = data;
      return _popupScope;
    };

    if (!arguments.length) return _popupScope;

    if (typeof elem === "string" &&
        document.getElementById (elem) !== null &&
        document.getElementById (elem) !== undefined)
    {
      _template = document.getElementById (elem);
      _domElem  = document.createElement ('div');
      _domElem.style.borderStyle = 'none';
      _domElem.style.borderWidth = '0px';
      _domElem.style.position = 'absolute';
      _domElem.style.display = 'block';
    }

    return _popupScope;
  };

  _data = function (obj)
  {
    var _dataScope = this,
        _dataOrig  = [ null ],
        _data      = {},
        _key       = "",
        _keySet    = false;

    _dataScope.key = function (str)
    {
      if (!arguments.length) return _key;

      var dataLen  = _dataOrig.length,
          longNdx  = 0,
          loopLen  = 0,
          keyNdxOf = [];
      _key         = str;

      while (dataLen--)
      {
        var keyLen        = _dataOrig[dataLen][str].length;
        keyNdxOf[dataLen] = {};

        if (keyLen > loopLen)
        {
          longNdx = dataLen;
          loopLen = keyLen;
        }

        while (keyLen--) keyNdxOf[dataLen][_dataOrig[dataLen][str][keyLen]] = keyLen;
      }

      while (loopLen--)
      {
        var key = _dataOrig[longNdx][str][loopLen];
        _data[key] = {};
        for (var obj in _dataOrig[longNdx]) { _data[key][obj] = _dataOrig[longNdx][obj][loopLen]; }
        dataLen = _dataOrig.length;

        while (dataLen--)
        {
          if (dataLen !== longNdx)
          {
            var matchNdx = keyNdxOf[dataLen][key];
            for (var matchObj in _dataOrig[dataLen]) { _data[key][matchObj] = _dataOrig[dataLen][matchObj][matchNdx]; }
          }
        }
      }

      _keySet = true;
      return _dataScope;
    };

    _dataScope.keys = function ()
    {
      var keys = [];
      for (var key in _data) { keys.push (key); }
      return keys;
    };

    _dataScope.datum = function (key, value)
    {
      if (!arguments.length) return _keySet ? _data : _dataOrig;
      if (key)
      {
        if (value)
        {
          if (_keySet) _data[key] = value;
          else _dataOrig[key] = value;
        }
        else return _keySet ? _data[key] : _dataOrig[key];
      }
      return _dataScope;
    };

    if (!arguments.length) return _dataScope;
    _dataOrig = obj;
    return _dataScope;
  };

  pooch_map = function (house, options)
  {
    var _mapScope     = this,
        _google       = true,
        _bing         = false,
        _map          = null,
        _symGrp       = [],
        _width        = 500,
        _height       = 500,
        _center       = null,
        _defaultView  = { lat: 37.090238, lng: -95.7129, zoom: 4 },
        _zoom         = 5,
        _zoomMax      = 18,
        _zoomMin      = 2,
        _options      = options || {},
        _overlay      = null,
        _chart        = null,
        _zoomControl  = null,
        _funcQueue    = [],
        _house        = null;

    _mapScope.house = function (elem)
    {
      if (!arguments.length) return _house;
      _house = pooch.fetch (elem).dom ();
      return _mapScope;
    };

    _mapScope.chart = function (obj)
    {
      if (!arguments.length) return _chart;
      _chart = obj;
      return _mapScope;
    };

    _mapScope.draw = function (val)
    {
      if (_chart)
      {
        var qLen = _funcQueue.length;

        if (qLen)
        {
          while (qLen--)
          {
            _funcQueue[qLen].func (_funcQueue[qLen].arg);
          }
          _funcQueue = [];
        }
        _chart.draw (val);
      }

      else _mapScope.init ();
      return _mapScope;
    };

    _mapScope.zoomControl = function (obj)
    {
      if (!arguments.length) return _zoomControl;
      _zoomControl = obj;
      _zoomControl.target (_mapScope, null, null);
      return _mapScope;
    };

    _mapScope.api = function (str)
    {
      if (!arguments.length) return _api;
      _google   = str.toUpperCase () === "GOOGLE" ? true : false;
      _bing     = str.toUpperCase () === "BING" ? true : false;
      return _mapScope;
    };

    _mapScope.map = function (obj)
    {
      if (!arguments.length) return _map;
      _map = obj;
      return _mapScope;
    };

    _mapScope.symbolGroup = function (obj)
    {
      if (!arguments.length) return _symGrp;
      if (_chart)
      {
        var len = obj.length;
        _chart.symbolGroup (obj);

        for (var i = 0; i < len; ++i)
        {
          _symGrp[i] = _chart.symbolGroup ()[i];
          _symGrp[i].map (_mapScope);
        }
      }
      else _funcQueue.push ( { func: _mapScope.symbolGroup, arg: obj } );
      return _mapScope;
    };

    _mapScope.reset = function ()
    {
      if (_map)
      {
        _mapScope.center ({ lat: _defaultView.lat, lng: _defaultView.lng })
                 .zoom (_defaultView.zoom);
      }
      return _mapScope;
    };

    _mapScope.zoom = function (val)
    {
      if (!arguments.length) return _zoom;
      _zoom = val;

      if (_map)
      {
        if (_google && _map.getZoom () != _zoom) _map.setZoom (_zoom);
        else if (_bing) _map.setView ({ zoom: _zoom });
      }
      return _mapScope;
    };

    _mapScope.zoomMax = function (val)
    {
      if (!arguments.length) return _zoomMax;
      _zoomMax = val;
      return _mapScope;
    };

    _mapScope.zoomMin = function (val)
    {
      if (!arguments.length) return _zoomMin;
      _zoomMin = val;
      return _mapScope;
    };

    _mapScope.defaultView = function (obj)
    {
      if (!arguments.length) return _defaultView;
      if (typeof obj.lat !== "undefined") _defaultView.lat = obj.lat;
      if (typeof obj.lng !== "undefined") _defaultView.lng = obj.lng;
      if (typeof obj.zoom !== "undefined") _defaultView.zoom = obj.zoom;
      return _mapScope;
    };

    _mapScope.zoomIn = function ()
    {
      if (_map)
      {
        if (_google || _bing) _zoom = _map.getZoom ();
        if (_zoom + 1 <= _zoomMax) _mapScope.zoom (_zoom + 1);
      }
      return _mapScope;
    };

    _mapScope.zoomOut = function ()
    {
      if (_map)
      {
        if (_google || _bing) _zoom = _map.getZoom ();
        if (_zoom - 1 >= _zoomMin) _mapScope.zoom (_zoom - 1);
      }
      return _mapScope;
    };

    _mapScope.center = function (obj)
    {
      if (!arguments.length) return _center;
      _center = obj;
      if (_map)
      {
        if (_google) _map.setCenter (new google.maps.LatLng (_center.lat, _center.lng));
      }
      return _mapScope;
    };

    _mapScope.width = function (val)
    {
      if (!arguments.length) return _house ? parseInt (pooch.fetch (_house).css ("width"), 10) : _width;
      _width = val;
      // TODO adjust layout
      return _mapScope;
    };

    _mapScope.height = function (val)
    {
      if (!arguments.length) return _house ? parseInt (pooch.fetch (_house).css ("height"), 10) : _height;
      _height = val;
      // TODO adjust layout
      return _mapScope;
    };

    _mapScope.loadMap = function ()
    {
      if (_google)
      {
        var style = [ { featureType: "all",                elementType: "all",      stylers: [ { lightness: 33 },            { gamma: 0.8 },      { saturation: -61 } ] },
                      { featureType: "road.local",         elementType: "geometry", stylers: [ { saturation: -73 },          { lightness: 33 },   { gamma: 0.8 },               { visibility: "simplified" } ] },
                      { featureType: "road.arterial",      elementType: "geometry", stylers: [ { saturation: -91 },          { gamma: 0.8 },      { visibility: "simplified" }, { lightness: 100 } ] },
                      { featureType: "road.arterial",      elementType: "labels",   stylers: [ { visibility: "off" } ] },
                      { featureType: "road.highway",       elementType: "geometry", stylers: [ { visibility: "simplified" }, { saturation: -91 }, { gamma: 0.8 },               { lightness: 94 } ] },
                      { featureType: "road.highway",       elementType: "labels",   stylers: [ { visibility: "off" } ] },
                      { featureType: "landscape.man_made", elementType: "geometry", stylers: [ { visibility: "simplified" }, { gamma: 0.76 } ] } ];

        var mapOptions = { disableDefaultUI:      true,
                           zoom:                  _defaultView.zoom,
                           center:                new google.maps.LatLng (_defaultView.lat, _defaultView.lng),
                           mapTypeControlOptions: { mapTypeIds: ["poochStyle", google.maps.MapTypeId.ROADMAP] }
                         };

        var customMapType = new google.maps.StyledMapType (style);
        _map              = new google.maps.Map (_house, mapOptions);
        _map.mapTypes.set ("poochStyle", customMapType);
        _map.setMapTypeId ("poochStyle");
        _overlay = new __google_overlay (_mapScope);
        //google.maps.event.addListener (that.map, 'zoom_changed', function (){nytg.delicious.map.zoomChanged ();});

      }

      else if (_bing)
      {
        _map = new Microsoft.Maps.Map (_house,
                                      {credentials: "TODO add the option to initialize with credentials",
                                        center: new Microsoft.Maps.Location (_defaultView.lat, _defaultView.lng),
                                        mapTypeId: Microsoft.Maps.MapTypeId.road,
                                        showDashboard: false,
                                        showScalebar: false,
                                        zoom: _defaultView.zoom,
                                        height: _mapScope.height (),
                                        width: _mapScope.width ()
                                      });
        //Microsoft.Maps.Events.addHandler (_map, 'mousewheel', function (){ nytg.delicious.map.zoomChanged (); });

        //nytg.delicious.zoom.initialize (this.zoomNodeID, this.map, nytg.delicious.minZoomLevel, nytg.delicious.maxZoomLevel);
        //nytg.delicious.mapsLoaded ();
      }

        if (_zoomControl)
        {
          _house.appendChild (_zoomControl.domElem ());
          _zoomControl.house (_house);
        }
    };

    _mapScope.init = function ()
    {
      if (_google)
      {
        var google = document.createElement ("script");
        google.setAttribute ("type", "text/javascript");
        google.setAttribute ("src", "http://maps.google.com/maps/api/js?sensor=false&callback=pooch_initMapAPIs");
        document.body.appendChild (google);
      }
      else if (_bing)
      {
        var bing = document.createElement ("script");
        bing.setAttribute ("type", "text/javascript");
        bing.setAttribute ("src", "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&onScriptLoad=pooch_initMapAPIs");
        document.body.appendChild (bing);
      }
      return _mapScope;
    };

    if (!arguments.length) return _mapScope;
    _house = pooch.fetch (house). dom ();
    if (!_house) return _mapScope;
    pooch_baseMap = _mapScope;
    return _mapScope;

  };

  var __google_overlay = function (mapObj, funcQueue)
  {
    var _overlayScope  = this,
        _bounds        = null,
        _mapObj        = mapObj,
        _funcQueue     = funcQueue,
        _map           = mapObj.map (),
        _chart         = mapObj.chart (),
        _div           = null;

    _overlayScope.prototype = new google.maps.OverlayView ();

    var _dragEndEvent = function ()
    {
      _updateChart ();
    };

    var _zoomChangedEvent = function ()
    {
      if (_mapObj.zoomControl () && _mapObj.zoomControl ().slider ()) _updateChart ();
    };

    var _updateChart = function ()
    {
      _bounds       = _map.getBounds ();

      var overProj  = _overlayScope.prototype.getProjection (),
          point     = google.maps.Point,
          mapNW     = new google.maps.LatLng (_bounds.getNorthEast ().lat (), _bounds.getSouthWest ().lng ()),
          divPix    = overProj.fromLatLngToDivPixel (mapNW),
          chartNW   = overProj.fromDivPixelToLatLng (new point (divPix.x, divPix.y)), //(new point (divPix.x - _mapObj.width (), divPix.y - _mapObj.height ())),
          chartSE   = overProj.fromDivPixelToLatLng (new point (divPix.x + _mapObj.width (), divPix.y + _mapObj.height ())), //(new point (divPix.x + _mapObj.width () * 2, divPix.y + _mapObj.height () * 2));
          nwLng     = chartNW.lng (),
          seLng     = chartSE.lng (),
          adjChartW = nwLng;

      if (nwLng > 0 && seLng < 0) adjChartW = -180 + ((180 - nwLng) * -1);
      else if (nwLng < 0 && seLng < 0 && nwLng > seLng) adjChartW = -360 + nwLng;
      else if (nwLng > 0 && seLng > 0  && nwLng > seLng) adjChartW = nwLng - 360;

      _chart.axisMinX (pooch.helpers.lngToMercator (adjChartW))
            .axisMaxX (pooch.helpers.lngToMercator (seLng))
            .axisMaxY (pooch.helpers.latToMercator (chartNW.lat ()))
            .axisMinY (pooch.helpers.latToMercator (chartSE.lat ()));

      if (_isSafari)
      {
        pooch.fetch (_chart.house ()).css ({ display: "none" });
        _mapObj.draw ();
        setTimeout (function (){ _moveAndDraw (divPix); }, 1);
      }
      else
      {
        _mapObj.draw ();
        pooch.fetch (_chart.house ()).css ({ top: divPix.y + "px", left: divPix.x + "px", display: "block" });
        _mapObj.zoom (_map.getZoom ());
        _mapObj.zoomControl ().update ();
      }
    };

    var _moveAndDraw = function (divPix)
    {
      pooch.fetch (_chart.house ()).css ({ top: divPix.y + "px", left: divPix.x + "px", display: "block" });
      _mapObj.zoom (_map.getZoom ());
      _mapObj.zoomControl ().update ();
    };

    _overlayScope.bounds = function (obj)
    {
      if (!arguments.length) return _bounds;
      _bounds = obj;
      return _overlayScope;
    };

    _overlayScope.prototype.onAdd = function ()
    {
      var div = document.createElement ('div');
      div.style.borderStyle = 'none';
      div.style.borderWidth = '0px';
      div.style.position = 'absolute';
      _div = div;

      var panes = _overlayScope.prototype.getPanes ();
      panes.overlayMouseTarget.appendChild (div);

      _chart = new pooch.chart (div);
      _mapObj.chart (_chart);

      _chart.height (_mapObj.height ())
            .width (_mapObj.width ());
      _updateChart ();

      google.maps.event.addListener (_map, 'dragend', function () { _dragEndEvent (); });
      google.maps.event.addListener (_map, 'zoom_changed', function () { _zoomChangedEvent (); });
    };

    _overlayScope.prototype.draw = function ()
    {
      // Method needed to prototype
    };

    _overlayScope.prototype.onRemove = function ()
    {
      _div.parentNode.removeChild (_div);
      _div = null;
    };
    _overlayScope.prototype.setMap (_map);
  };

  _fetch = function (elem)
  {
    var _fetchScope = this,
        _domElem = null;

    var _computedStyle = function (prop)
    {
      if (!arguments.length) return _fetchScope;
      if (_domElem.currentStyle) return _domElem.currentStyle[prop];
      else if (document.defaultView && document.defaultView.getComputedStyle) return document.defaultView.getComputedStyle (_domElem, "")[prop];
      else return _domElem.style[prop];
    };

    _fetchScope.css = function (obj)
    {
      var camelize  = function (str)
                      {
                        var parts = str.split ('-'),
                            len   = parts.length;

                        if (len === 1) return parts[0];
                        var camelized = str.charAt (0) === '-' ? parts[0].charAt (0).toUpperCase () + parts[0].substring (1) : parts[0];
                        for (var i = 1; i < len; i++) camelized += parts[i].charAt (0).toUpperCase () + parts[i].substring (1);

                        return camelized;
                      };

      if (typeof obj === "string")
      {
        return _computedStyle (obj);
      }
      else
      {
        for (var key in obj)
        {
          if (_css2js[key] === undefined) _domElem.style[camelize (key)] = obj[key];
          else _domElem.style[_css2js[key]] = obj[key];
        }
      }
      return _fetchScope;
    };

    _fetchScope.dom = function ()
    {
      return _domElem;
    };

    _fetchScope.html = function (str)
    {
      if (!arguments.length) return _domElem.innerHTML;
       _domElem.innerHTML = str;
      return _domElem;
    };

    _fetchScope.mouseOver = function (func)
    {
      if (typeof func === "function")
      {
        _domElem.addEventListener ("mouseover", function (e) { _mouseEvent (_domElem, e, func); }, false);
      }
      return _fetchScope;
    };

    _fetchScope.mouseMove = function (func)
    {
      if (typeof func === "function")
      {
        _domElem.addEventListener ("mousemove", function (e) { _mouseEvent (_domElem, e, func); }, false);
      }
      return _fetchScope;
    };

    _fetchScope.mouseDown = function (func)
    {
      if (typeof func === "function")
      {
        _domElem.addEventListener ("mousedown", function (e) { _mouseEvent (_domElem, e, func); }, false);
      }
      return _fetchScope;
    };

    _fetchScope.mouseOut = function (func)
    {
      if (typeof func === "function")
      {
        _domElem.addEventListener ("mouseout", function (e) { _mouseEvent (_domElem, e, func); }, false);
      }
      return _fetchScope;
    };

    _fetchScope.mouseUp = function (func)
    {
      if (typeof func === "function")
      {
        _domElem.addEventListener ("mouseup", function (e) { _mouseEvent (_domElem, e, func); }, false);
      }
      return _fetchScope;
    };

    _fetchScope.removeEvent = function (str)
    {
      if (typeof str === "string")
      {

      }
      return _fetchScope;
    };

    if (!arguments.length || elem === undefined) return _fetchScope;

    if (typeof elem === "string")
    {
      if (elem.substr (0, 1) === "#") _domElem = document.getElementById (elem.substr (1, elem.length));
      else if (elem.substr (0, 1) === ".") _domElem = document.getElementsByClassName (elem.substr (1, elem.length))[0];
      else if (document.getElementById (elem) !== null && document.getElementById (elem) !== undefined) document.getElementById (elem);
    }
    else if (elem.tagName || elem.nodeName)
    {
       _domElem = elem;
    }

    return _fetchScope;
  };

  pooch.helpers =
  {

    keyFromObj: function (obj)
    {
      for (var key in obj) { if (obj.hasOwnProperty (key)) return key; }
      return null;
    },

    formatNumber: function (num)
    {
      num = num.toString ();
      parts = num.toString ().split ('.');
      parts[0] = parts[0].replace (/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
      return parts.join ('.');
    },

    distanceToPoint: function (x1, y1, x2, y2)
    {
      return Math.sqrt ((x1 -= x2) * x1 + (y1 -= y2) * y1);
    },

    latToMercator: function (val)
    {
      var rad    = val * (Math.PI / 180),
          radSin = Math.sin (rad),
          meters = 6378137 / 2.0 * Math.log ((1.0 + radSin) / (1.0 - radSin));
      return meters;
    },

    lngToMercator: function (val)
    {
      var meters = val * 0.017453292519943 * 6378137;
      return meters;
    },

    indexOf: function (arr, val)
    {
      var arrLen = arr.length;
      while (arrLen--) if (arr[arrLen] === val) return arrLen;
    },

    parseWebkitMatrix: function (val)
    {
      var matrixRE = /\([0-9epx\.\, \t\-]+/gi,
          valSplit = val.match (matrixRE)[0].substr (1).split (",");
      return { m11: valSplit[0], m12: valSplit[1], m21: valSplit[2], m22: valSplit[3], tX: valSplit[4], tY: valSplit[5] };
    },

    degreesToRadians: function (deg)
    {
      return (deg * Math.PI) / 180;
    },

    pieChart: function (val)
    {
      var pieChartObj = function (field)
      {
        var _pieScope = this,
            _field    = field,
            _sumTo    = function (key, datum, order)
            {
              var orderLen = order.length,
                  sum      = 0;

              while (orderLen--)
              {
                if (order[orderLen] !== key) sum += datum[order[orderLen]][_field];
                else return sum;
              }
            },
            _pieVars = function (sym)
            {
              var datum     = sym.symbolGroup.data ().datum (),
                    ctx     = sym.symbolGroup.context (),
                    order   = sym.symbolGroup.order (),
                    sum     = _sumTo (sym.poochID, datum, order),
                    sAngle  = (pooch.helpers.degreesToRadians (sum) / 100) * 360,
                    arcSize = (pooch.helpers.degreesToRadians (datum[sym.poochID][_field]) / 100) * 360,
                    eAngle  = sAngle + arcSize;
              return { sAngle: sAngle, eAngle: eAngle, ctx: ctx };
            };

        _pieScope.field = function (val)
        {
          if (!arguments.length) return _field;
          _field = val;
          return _pieScope;
        };

        _pieScope.process = function (sym, attrs, offset) //TODO delete data argument
        {
          var pieVars = _pieVars (sym);
          pieVars.ctx.beginPath ();
          pieVars.ctx.moveTo (attrs.x, attrs.y);
          pieVars.ctx.arc (attrs.x, attrs.y, attrs.size, pieVars.sAngle, pieVars.eAngle, false);
          pieVars.ctx.closePath ();
        };

        _pieScope.hitTest = function (sym, x, y)
        {
          var pieVars   = _pieVars (sym),
              fromCntrX = sym.x - x,
              fromCntrY = sym.y - y,
              distCntr  = Math.sqrt( Math.pow( fromCntrX, 2 ) + Math.pow( fromCntrY , 2 ) );

          if (distCntr < sym.size)
          {
            var cAngle = Math.atan2 (fromCntrY, fromCntrX) + Math.PI;
            if (cAngle >= pieVars.sAngle && cAngle <= pieVars.eAngle) return true;
          }

          return false;
        };

        return _pieScope;
      };
      return new pieChartObj (val);
    }

  };

  window.pooch_initMapAPIs = function ()
  {
    pooch_baseMap.loadMap ();
  };

  window.pooch_baseMap = null;
  var _isSafari        = (typeof (navigator.vendor) === "object" && navigator.vendor.indexOf ("Apple") !== -1) ? true : false;
      _chartNdx        = 0,
      _css2js          = { "float":"styleFloat",
                           "text-decoration: blink":"textDecorationBlink",
                           "text-decoration: line-through":"textDecorationLineThrough",
                           "text-decoration: none":"textDecorationNone",
                           "text-decoration: overline":"textDecorationOverline",
                           "text-decoration: underline":"textDecorationUnderline" },

      _mouseEvent      = function (domElem, e, func)
                         {
                           if (domElem.getBoundingClientRect)
                           {
                             var domRect = domElem.getBoundingClientRect (),
                                 left    = domRect.left, // + document.body.scrollLeft
                                 top     = domRect.top; // + document.body.scrollTop
                             e.localX    = e.clientX - left;
                             e.localY    = e.clientY - top;
                           }
                           func (e);
                          };
  pooch.log ("pooch.js v" + pooch.version);

})();

// Regex to add space before parens \b\((?! | \))