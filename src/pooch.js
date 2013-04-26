(function ()
{
  pooch = { version: "0.1.0" , author: "Jeremy White"};

  pooch.chart = function (id)
  {
    return new __chart (id);
  };

  pooch.data = function (obj)
  {
    return new __data (obj);
  };

  pooch.fetch = function (elem)
  {
    return new __fetch (elem);
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
    return new __popup (elem);
  };

  pooch.symbolGroup = function (shape)
  {
    return new __symbolGroup (shape);
  };

  pooch.zoomControl = function (elem)
  {
    return new __zoomControl (elem);
  };

  pooch.supportsCanvas = !!document.createElement ('canvas').getContext;

  var __chart = function (id)
  {
    var _chartScope   = this,
        _bounds       = [],
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
        _unitsPerPx   = { x: 1, y: 1 },
        _zoom         = 0,
        _zoomLevels   = [1, 2, 4, 8, 16],
        _zoomStep     = 1,
        _zoomSteps    = 1,
        _isZooming    = false,
        _center       = { x: 50, y: 50 },
        _offsetX      = 0,
        _offsetY      = 0,
        _usesBack     = false,
        _usesMain     = false,
        _ctxBack      = null,
        _ctxBackHlt   = null,
        _ctxMain      = null,
        _ctxMainHlt   = null,
        _ctxMainHdn   = null,
        _cvsMainHdn   = null,
        _ctxBackHdn   = null,
        _cvsBackHdn   = null,
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
        _layersHdn    = [],
        _layersPre    = [{_container: "div"}],
        _layersMain   = [{_highlightMain: "canvas"}, {_main: "canvas"}, {_highlightBack: "canvas"}, {_back: "canvas"}, {_base: "div"}],
        _layersPost   = [{_mouse: "div"}, {_popup: "div"}];

    var _adjustLayout = function (obj)
    {
      var attrKey = pooch.helpers.keyFromObj (obj),
          px      = obj[attrKey] === 0 ? 0 : "px",
          cssObj  = {},
          ndxHdn  = _layersHdn.length,
          ndxPre  = _layersPre.length,
          ndxMain = _layersMain.length,
          ndxPost = _layersPost.length;

      cssObj[attrKey] = obj[attrKey] + px;

      if (pooch.supportsCanvas)
      {
        while (ndxHdn--)
        {
          _layersHdn[ndxHdn].width        = _width * 3;
          _layersHdn[ndxHdn].style.width  = (_width * 3) + "px";
          _layersHdn[ndxHdn].height       = _height * 3;
          _layersHdn[ndxHdn].style.height = (_height * 3) + "px";
        }
      }
      else
      {
        // TODO: Add non-canvas layout changes
      }

      while (ndxPre--)
      {
        var keyPre   = pooch.helpers.keyFromObj (_layersPre[ndxPre]),
            fetchPre = pooch.fetch ("#pooch" + keyPre + "_" + _id);

        fetchPre.css (cssObj).dom ()[attrKey] = obj[attrKey];
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
          xLoc    = x - _width,
          yLoc    = y - _height,
          popOffX = symGrp.popup ().offsetX (),
          popOffY = symGrp.popup ().offsetY (),
          width   = symGrp.popup ().width (),
          height  = symGrp.popup ().height ();

      if (yLoc - height - popOffY - 2 < 0) yAdj = popOffY;
      else yAdj = -height - popOffY;
      if (xLoc + popOffX - (width / 2) - 2 < 0) xAdj = -xLoc + 2;
      else if (xLoc + popOffX + (width / 2) + 2 > _width) xAdj = _width - (xLoc + width) - 2;
      else xAdj = popOffX + (width / -2);

      symGrp.popup ().x (xLoc + xAdj)
                     .y (yLoc + yAdj);
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

    var _pntInPoly= function (shape, point)
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
        var x             = e.localX + _width,
            y             = e.localY + _height,
            found         = false,
            symFnd        = false,
            symGrpsFnd    = [],
            symsFnd       = [],
            count         = 0,
            len           = _symGrp.length,
            closestDist   = _width * 3,
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
                    found = _pntInPoly (sym[obj].shapePoints, [x, y]);
                    break;

                  case "custom":
                    found = _symGrp[i].customShape ().hitTest (sym[obj], { x: -x, y: -y });
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

            var symGrpCur   = symGrpClosest,
                symCur      = symClosest;

            if (_symCur !== symCur && symCur)
            {
              if (_symGrpCur)
              {
                // TODO Clean this up. No need to clear ctx here and then from _drawSymGrps ().
                if (_symGrpCur.popup ()) _symGrpCur.popup ().hide ();
                if (_symGrpCur.layer ().toUpperCase () === "MAIN") _clearCtx (_ctxMainHlt, 0, 0, _width, _height);
                else _clearCtx (_ctxBackHlt, 0, 0, _width, _height);
              }

              var keyObj              = {},
              layer                   = symGrpCur.layer ().toUpperCase () === "MAIN" ? "highlightMain" : "highlightBack";
              _symGrpCur              = symGrpCur;
              _symCur                 = symCur;
              keyObj[_symCur.poochID] = _symCur;
              _stepCnt                = _stepTot     = 1;
              if (_symGrpCur.popup ()) _fillPop (_symGrpCur, _symGrpCur.state (), _symCur.poochID, x, y);
              pooch.fetch (_house).css ({ cursor: "pointer"});
              _drawSymGrps (null, layer, { obj: _symGrpCur, key: keyObj });
            }
            else if (_symCur === symCur && symCur)
            {
              if (_symGrpCur.popup ()) _movePop (symGrpCur, x, y);
            }
          }

          else
          {
            if (_symCur)
            {
              if (_symGrpCur.popup ()) _symGrpCur.popup ().hide ();
              pooch.fetch (_house).css ({ cursor: "default"});
              if (_symGrpCur.layer ().toUpperCase () === "MAIN") _clearCtx (_ctxMainHlt, 0, 0, _width, _height);
              else _clearCtx (_ctxBackHlt, 0, 0, _width, _height);
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

    var _frameCalc = function (symGrp, key, time, dur)
    {
      var sym       = symGrp.datum (key),
          symState  = symGrp.state (),
          data      = symGrp.data ().datum (),
          symAttrs  = symGrp.symAttrs (),
          frameCalc = symGrp.frameCalculation ();

      if (time === 1 || frameCalc)
      {
        sym.changeList = {};

        for (var attr in symGrp.changeList ())
        {
          sym.changeList[attr] = typeof symAttrs[attr] === "function" ? symAttrs[attr](sym, data[key]) : symAttrs[attr] !== null ? symAttrs[attr] : sym[attr];
        }
      }

      for (var change in symGrp.changeList ())
      {
        var stepFunc = symGrp.stepFunc (change);
        if (frameCalc) sym[change] = sym.changeList[change];
        else sym[change] = stepFunc (symState[key][change], sym.changeList[change], time, dur, sym.easing);
      }
    };

    var _shapeCalc = function (symGrp, key, ctx, isHlt)
    {
      var sym     = symGrp.datum (key),
          isMap   = symGrp.map (),
          horVar  = isMap ? sym.lng : sym.x,
          vertVar = isMap ? sym.lat : sym.y,
          x       = !_wholeNums ? horVar : horVar >> 0,
          y       = !_wholeNums ? vertVar : vertVar >> 0;

      if (isHlt)
      {
        x -= _width;
        y -= _height;
      }

      switch (sym.shape)
      {
        case "circle":
          var size = !_wholeNums ? sym.size : sym.size >> 0;
          ctx.arc (x + _offsetX, y + _offsetY, size, 0, _circle, false);
        break;

        case "rect":
          var width      = !_wholeNums ? sym.width : sym.width >> 0,
              height     = !_wholeNums ? sym.height : sym.height >> 0,
              halfWidth  = !_wholeNums ? sym.width / 2 : (sym.width / 2) >> 0,
              halfHeight = !_wholeNums ? sym.height / 2 : (sym.height / 2) >> 0;
          ctx.rect (x - halfWidth + _offsetX, y - halfHeight + _offsetY, width, height);
        break;

        case "bezcurve":
          // var multiplier = (sym["xEnd"] < x) ? true : false;
          // var firstX = (multiplier) ? x - ((x - sym["xEnd"]) * .5) : x + ((sym["xEnd"] - x) * .5);
          // //var secondX = (multiplier) ? sym["xEnd"] + (sym["xEnd"] - (x / 2)) : x + (x - (sym["xEnd"] / 2));
          // ctx.moveTo (x, y);
          // ctx.bezierCurveTo (firstX,
          //                       y,
          //                       firstX,
          //                       sym["yEnd"],
          //                       sym["xEnd"],
          //                       sym["yEnd"]);
        break;

        case "line":
          ctx.moveTo (x + _offsetX, y + _offsetX);
          var orderNdx = symGrp.datum (key).order,
              symPrev  = orderNdx > 0 ? symGrp.state (symGrp.order ()[orderNdx - 1]) : symGrp.datum (key);
          ctx.lineTo (symPrev.x + _offsetX, symPrev.y + _offsetY);

        break;

        case "linkLine":
          ctx.moveTo (x + _offsetX, y + _offsetX);
          var symLink  = symGrp.datum (key).link || sym;
          ctx.lineTo (symLink.x + _offsetX, symLink.y + _offsetY);

        break;

        case "hex":
          var halfWidHex  = !_wholeNums ? sym.width / 2 : (sym.width / 2) >> 0,
              halfHghtHex = !_wholeNums ? sym.height / 2 : (sym.height / 2) >> 0,
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
          var polys = sym.shapePoints,
              brds  = polys.length;

          while (brds--)
          {
            var pts   = polys[brds].length - 1,
                moveX = isHlt ? polys[brds][pts][0] - _width : polys[brds][pts][0],
                moveY = isHlt ? polys[brds][pts][1] - _height : polys[brds][pts][1];
            ctx.moveTo (moveX, moveY);
            while (pts--)
            {
              var lineX = isHlt ? polys[brds][pts][0] - _width : polys[brds][pts][0],
                  lineY = isHlt ? polys[brds][pts][1] - _height : polys[brds][pts][1];
              ctx.lineTo (lineX, lineY);
            }
          }
          // if (!scope.supportsCanvas) drawString.push ("^");
        break;

        case "custom":
          var xAdj = isHlt ? _offsetX - _width : _offsetX,
              yAdj = isHlt ? _offsetY - _height : _offsetY;
          symGrp.customShape ().process (sym, { x: xAdj, y: yAdj });
        break;

        default:
          var sizeDef = !_wholeNums ? sym.size : sym.size >> 0;
          ctx.arc (x + _offsetX, y + _offsetY, sizeDef, 0, _circle, false);
      }
    };

    var _drawCalc = function (symGrp, key, ctx, isHlt)
    {
      var sym = symGrp.datum (key);

      if (pooch.supportsCanvas)
      {
        var drawFill      = isHlt ? sym.drawFillHighlight : sym.drawFill,
            fillColor     = isHlt ? sym.fillColorHighlight : sym.fillColor,
            fillOpacity   = isHlt ? sym.fillOpacityHighlight : sym.fillOpacity,
            drawStroke    = isHlt ? sym.drawStrokeHighlight : sym.drawStroke,
            strokeWidth   = isHlt ? sym.strokeWidthHighlight : sym.strokeWidth,
            strokeColor   = isHlt ? sym.strokeColorHighlight : sym.strokeColor,
            strokeOpacity = isHlt ? sym.strokeOpacityHighlight : sym.strokeOpacity;

        if (drawFill) ctx.fillStyle = "rgba(" + fillColor + ", " + fillOpacity + ")";

        if (drawStroke)
        {
          ctx.lineWidth = strokeWidth;
          ctx.strokeStyle = "rgba(" + strokeColor + ", " + strokeOpacity + ")";
        }
        _shapeCalc (symGrp, key, ctx, isHlt);
      }
    };

    var _clearLayers = function (layer, hlt, isAnim)
    {
      var symLayer  = "",
          hdnX      = isAnim ? _width : 0,
          hdnY      = isAnim ? _height : 0,
          hdnWid    = isAnim ? _width : _width * 3,
          hdnHgt    = isAnim ? _height : _height * 3;

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
                _clearCtx (_ctxBack, 0, 0, _width, _height);
                _clearCtx (_ctxBackHlt, 0, 0, _width, _height);
                _clearCtx (_ctxBackHdn, hdnX, hdnY, hdnWid, hdnHgt);
              }
              break;

            case "MAIN":
              if (!clrMain)
              {
                clrMain = true;
                _clearCtx (_ctxMain, 0, 0, _width, _height);
                _clearCtx (_ctxMainHlt, 0, 0, _width, _height);
                _clearCtx (_ctxMainHdn, hdnX, hdnY, hdnWid, hdnHgt);
              }
              break;

            default:
              if (!clrHlt)
              {
                clrHlt = true;
                _clearCtx (_ctxMainHlt, 0, 0, _width, _height);
                _clearCtx (_ctxBackHlt, 0, 0, _width, _height);
              }
          }
        }
      }
      else
      {
        symLayer = layer.toUpperCase ();
        var isHlt  = hlt ? true : false,
            ctx    = isHlt ? symLayer === "HIGHLIGHTMAIN" ? _ctxMainHlt : _ctxBackHlt : symLayer === "MAIN" ? _ctxMain : _ctxBack,
            ctxHid = isHlt ? null : symLayer === "MAIN" ? _ctxMainHdn : _ctxBackHdn;
        _clearCtx (ctx, 0, 0, _width, _height);
        if (ctxHid !== null) _clearCtx (ctxHid, hdnX, hdnY, hdnWid, hdnHgt);
      }
    };

    var _drawSymGrps = function (time, layer, hlt, callback)
    {
      clearTimeout (_timeOut);

      if (typeof time === "undefined" || typeof time === null || isNaN (time)) _stepTot = 1;

      var isHlt     = hlt ? true : false,
          len       = isHlt ? 1 : _symGrp.length,
          clearHdn  = _stepCnt < _stepTot;
      _isAnimating  = true;
      _usesBack     = isHlt ? _usesBack : false;
      _usesMain     = isHlt ? _usesMain : false;

      //var drawString = [];
      if (_house)
      {
        if (pooch.supportsCanvas)
        {
          _clearLayers (layer, hlt, clearHdn);
        }
        else
        {
          //stepTotal = 1;
          //scope.animTickTotal = 1;
        }

        for (var i = 0; i < len; ++i)
        {
          var symGrp   = isHlt ? hlt.obj : _symGrp[i],
              symLayer = symGrp.layer ().toUpperCase (),
              drawOK   = true; //(typeof layer !== "undefined" && layer !== null && symLayer !== layer.toUpperCase ()) ? isHlt ? true : false : true;

          if (drawOK)
          {
            var sym       = isHlt ? hlt.key : symGrp.datum (),
                symOrder  = isHlt ? [pooch.helpers.keyFromObj (hlt.key)] : symGrp.order (),
                orderLen  = isHlt ? 1 : symOrder.length,
                symShape  = symGrp.shape ().toUpperCase (),
                ctx       = isHlt ? symLayer === "MAIN" ? _ctxMainHlt : _ctxBackHlt : symLayer === "MAIN" ? _ctxMainHdn : _ctxBackHdn,
                custShp   = symShape === "CUSTOM" ? true : false,
                batch     = symGrp.batch () ? true : false;

            if (ctx === _ctxMainHdn) _usesMain = true;
            else if (ctx === _ctxBackHdn) _usesBack = true;

            symGrp.context (ctx);
            if (_projection) symGrp.changeList ()["shapePoints"] = null; // TODO find a better home for this situation.

            if (batch && !isHlt)
            {
              var batchObj = symGrp.batchObj (),
                  batchLen = batch.length;

              for (var group in batchObj)
              {
                var groupLen = batchObj[group].length;
                if (!custShp) ctx.beginPath ();

                while (groupLen--)
                {
                  var key = batchObj[group][groupLen];
                  _frameCalc (symGrp, key, _stepCnt, _stepTot);
                  _drawCalc (symGrp, key, ctx, isHlt);
                }

                if (!custShp) ctx.fill ();
                if (!custShp) ctx.stroke ();
              }
            }

            else
            {
              for (var j = 0; j < orderLen; ++j)
              {
                if (!custShp) ctx.beginPath ();
                _frameCalc (symGrp, symOrder[j], _stepCnt, _stepTot);
                _drawCalc (symGrp, symOrder[j], ctx, isHlt);
                var drawFill   = isHlt ? sym[symOrder[j]].drawFillHighlight : sym[symOrder[j]].drawFill,
                    drawStroke = isHlt ? sym[symOrder[j]].drawStrokeHighlight : sym[symOrder[j]].drawStroke;
                if (drawFill && !custShp) ctx.fill ();
                if (drawStroke && !custShp) ctx.stroke ();
              }
            }
            if (_stepCnt === _stepTot) symGrp.changeList ({});
          }
        }

        if ((_usesMain || _usesBack) && !isHlt)
        {
          var sX      = _width,
              sY      = _height,
              sWidth  = _width,
              sHeight = _height,
              x       = 0,
              y       = 0,
              width   = _width,
              height  = _height;

          if (_usesMain) _ctxMain.drawImage (_cvsMainHdn, sX, sY, sWidth, sHeight, x, y, width, height);
          if (_usesBack) _ctxBack.drawImage (_cvsBackHdn, sX, sY, sWidth, sHeight, x, y, width, height);
        }

        _stepCnt++;

        if (_stepCnt <= _stepTot && _stepTot > 1)
        {
          _timeOut = setTimeout (function () { _drawSymGrps (_stepTot, layer, null, callback); }, 1);
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
          if (typeof callback === "function") callback ();
        }
      }
    };

    var _clearCtx = function (ctx, x, y, width, height)
    {
      if (ctx) ctx.clearRect (x, y, width, height);
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
          offX       = 0,
          offY       = 0,
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
            if (_symGrpCur.popup ()) _symGrpCur.popup ().hide ();
            _clearLayers (layerHlt, true);
            _symGrpCur = _symCur = null;
          }

          drag.elem         = this;
          e                 = e ? e : window.event;
          drag.elem.mouseX  = e.clientX;
          drag.elem.mouseY  = e.clientY;
          offX              = 0;
          offY              = 0;

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

            var adjX = e[0].clientX - drag.elem.mouseX,
                adjY = e[0].clientY - drag.elem.mouseY;

            offX += isNaN (adjX) ? 0 : adjX;
            offY += isNaN (adjY) ? 0 : adjY;

            var sX       = _width - offX < 0 ? 0 : _width - offX,
                sY       = _height - offY < 0 ? 0 : _height - offY,
                dX       = _width - offX < 0 ? -(_width - offX) : 0,
                dY       = _height - offY < 0 ? -(_height - offY) : 0,
                widX3    = _width * 3,
                hgtX3    = _height * 3,
                limitWid = sX + _width > widX3 ? widX3 - ((sX + _width) - _width) : _width,
                limitHgt = sY + _height > hgtX3 ? hgtX3 - ((sY + _height) - _height) : _height;

            if (_usesMain)
            {
              _clearCtx (_ctxMain, 0, 0, _width, _height);
              _ctxMain.drawImage (_cvsMainHdn, sX, sY, limitWid, limitHgt, dX, dY, limitWid, limitHgt);
            }
            if (_usesBack)
            {
              _clearCtx (_ctxBack, 0, 0, _width, _height);
              _ctxBack.drawImage (_cvsBackHdn, sX, sY, limitWid, limitHgt, dX, dY, limitWid, limitHgt);
            }
            drag.elem.mouseX = e[0].clientX;
            drag.elem.mouseY = e[0].clientY;
          }
          return false;
        },

        end : function ()
        {
          if (drag.elem === null) return;
          _isDragging = false;

          var adjX    = offX * _unitsPerPx.x,
              adjY    = offY * _unitsPerPx.y;
          _axisMinX   -= adjX;
          _axisMaxX   -= adjX;
          _axisMinY   += adjY;
          _axisMaxY   += adjY;

          _setCenter ();

          if (offX !== 0 || offY !== 0)
          {
            offX  = 0;
            offY  = 0;
            var i = _symGrp.length;

            while (i--)
            {
              if (_symGrp[i].shapeData ()) _symGrp[i].changeList ()["shapePoints"] = null;
              else { _symGrp[i].changeList ()["x"] = null; _symGrp[i].changeList ()["y"] = null; }
            }
            _drawSymGrps ();
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
                locX                = (_width * 3) * ((proj.x - minX) / (maxX - minX)),
                locY                = (_height * 3) - ((_height * 3) * ((proj.y - minY) / (maxY - minY)));

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
            dim     = isWidth ? _width * 3: _height * 3,
            valWid  = _axisMaxX - _axisMinX,
            valHgt  = _axisMaxY - _axisMinY,
            min     = isWidth ? _axisMinX - valWid : _axisMinY - valHgt,
            max     = isWidth ? _axisMaxX + valWid : _axisMaxY + valHgt,
            value   = typeof obj.val === "function" ? obj.val (obj.sym, obj.data) : obj.val,
            loc;
        if (isWidth) loc = dim * ((value - min) / (max - min));
        else loc = dim - (dim * ((value - min) / (max - min)));
        return loc;
      }
      return _chartScope;
    };

    _chartScope.fit = function (obj)
    {
      return _fit (obj);
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
        _bounds       = [arr[0], arr[1], arr[2], arr[3]];
        _axisDefaults = { minX: arr[3], maxX: arr[1], minY: arr[2], maxY: arr[0] };
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
        _bounds       = [bndsN, bndsE, bndsS, bndsW];
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

    _chartScope.stepCount = function (val)
    {
      if (!arguments.length) return _stepCnt;
      _stepCnt = val;
      return _chartScope;
    };

    _chartScope.stepTotal = function (val)
    {
      if (!arguments.length) return _stepTot;
      _stepTot = val;
      return _chartScope;
    };

    _chartScope.width = function (val)
    {
      if (!arguments.length) return _width;
      _width = val;
      if (_house)
      {
        _adjustLayout ({ width: _width });
      }
      else _funcQueue.push ( { func: _adjustLayout, arg: { width: _width } } );
      return _chartScope;
    };

    _chartScope.height = function (val)
    {
      if (!arguments.length) return _height;
      _height = val;
      if (_house)
      {
        _adjustLayout ({ height: _height });
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

    _chartScope.baseAPI = function (val)
    {
      if (!arguments.length) return _baseAPI;
      _baseAPI = val;
      var map = pooch.map ("#pooch_base_chart0")
                             .api ("google")
                             //.symbolGroup ([symbols1])
                             .chart (_chartScope)
                             .defaultView ({ lat: 37.090238, lng: -95.7129, zoom: 4 })
                             ////////.draw ();
                             //.zoomControl (zoomControl1);
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
      if (_house && !_isZooming)
       {
        _axisMinX = _axisDefaults.minX;
        _axisMaxX = _axisDefaults.maxX;
        _axisMinY = _axisDefaults.minY;
        _axisMaxY = _axisDefaults.maxY;
        _setCenter ();
        _chartScope.zoom (0);
      }
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
      if (_house && !_isZooming) if (_zoom + 1 < _zoomLevels.length) _chartScope.zoom (_zoom + 1);
      return _chartScope;
    };

    _chartScope.zoomOut = function ()
    {
      if (_house && !_isZooming)
      {
        if (_zoom - 1 === 0) _chartScope.reset ();
        else if (_zoom - 1 >= 0) _chartScope.zoom (_zoom - 1);
      }
      return _chartScope;
    };

    _chartScope.zoom = function (val)
    {
      if (!arguments.length) return _zoom;

      if (_zoomSteps > 1 && _zoom !== val && val !== 0)
      {
        _zoomStep = 1;
        _zoomAnim (_zoom, val);
      }
      else
      {
        _zoom = val;
        // TODO Tidy this up
        _axisMinX = _center.x - ((_axisDefaults.maxX - _axisDefaults.minX) / 2) / _zoomLevels[_zoom];
        _axisMaxX = _center.x + ((_axisDefaults.maxX - _axisDefaults.minX) / 2) / _zoomLevels[_zoom];
        _axisMinY = _center.y - ((_axisDefaults.maxY - _axisDefaults.minY) / 2) / _zoomLevels[_zoom];
        _axisMaxY = _center.y + ((_axisDefaults.maxY - _axisDefaults.minY) / 2) / _zoomLevels[_zoom];
        _setCenter ();
        _setUnitsPerPx ();
        var i = _symGrp.length;
        while (i--)
        {
          if (_symGrp[i].shapeData ()) _symGrp[i].changeList ()["shapePoints"] = null;
          else { _symGrp[i].changeList ()["x"] = null; _symGrp[i].changeList ()["y"] = null; }
        }
        _isZooming = false;
        _drawSymGrps ();
      }
      return _chartScope;
    };

    _chartScope.zoomSteps = function (val)
    {
      if (!arguments.length) return _zoomSteps;
      _zoomSteps = val;
      return _chartScope;
    };

    _chartScope.refresh = function (offset)
    {
      if (!arguments.length) offset = {x: 0, y: 0, width: _width, height: _height};
      if (_usesMain)
      {
       _ctxMain.clearRect (0, 0, _width, _height);
       _ctxMain.drawImage (_cvsMainHdn, offset.x + _width, offset.y + _height, offset.width, offset.height, 0, 0, _width, _height);
      }
      else if (_usesBack)
      {
       _ctxBack.clearRect (0, 0, _width, _height);
       _ctxBack.drawImage (_cvsBackHdn, offset.x + _width, offset.y + _height, offset.width, offset.height, 0, 0, _width, _height);
      }
      return _chartScope;
    };

    var _zoomAnim = function (sPos, ePos)
    {
      _isZooming = true;

      var change     = _zoomLevels[ePos] - _zoomLevels[sPos],
          time       = _zoomStep,
          zoomInterp = change * ((time = time / _zoomSteps - 1) * time * time + 1) + _zoomLevels[sPos],
          ratio      = _zoomLevels[sPos] / zoomInterp,
          offHdnWid  = _width * ratio,
          offHdnHgt  = _height * ratio,
          offHdnX    = (_width - offHdnWid) / 2,
          offHdnY    = (_height - offHdnHgt) / 2;

      if (offHdnWid > 0 &&
          offHdnHgt > 0 &&
          offHdnX   > 0 - _width &&
          offHdnX   < _width * 3 &&
          offHdnY   > 0 - _height &&
          offHdnY   < _height * 3)
      {
        _chartScope.refresh ({ x: offHdnX, y: offHdnY, width: offHdnWid, height: offHdnHgt });
        _zoomStep++;
      }
      else (_zoomStep = _zoomSteps + 2);

      if (_zoomStep - 1 <= _zoomSteps)
      {
        _timeOut = setTimeout (function () { _zoomAnim (sPos, ePos); }, 30);
      }
      else
      {
        _zoomStep = 1;
        _zoom     = ePos;
        _chartScope.zoom (_zoom);
      }
    };

    _chartScope.zoomLevels = function (arr)
    {
      if (!arguments.length) return _zoomLevels;
      _zoomLevels = arr;
      return _chartScope;
    };

    _chartScope.draw = function (count, layer, callback)
    {
      _stepCnt = 1;
      if (!arguments.length) _stepTot = 1;
      else _stepTot = count;

      if (_house) _drawSymGrps (count, layer, null, callback);
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
        var checkParams = function (e) { var ignore = function () { return _isAnimating || _isDragging || _mouseIgnore || _isZooming; } (); func (e, ignore); };
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
      if (obj === null)
      {
        if (_symCur && _symCur.symbolGroup.popup ()) _symCur.symbolGroup.popup ().hide ();
        if (_symCur && _symCur.symbolGroup.layer ().toUpperCase () === "MAIN") _clearCtx (_ctxMainHlt, 0, 0, _width, _height);
        else _clearCtx (_ctxBackHlt, 0, 0, _width, _height);
      }
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

          _cvsBackHdn              = document.createElement ('canvas');
          _cvsBackHdn.id           = "poochCvsBackHdn_" + _id;
          _cvsBackHdn.width        = _width;
          _cvsBackHdn.height       = _height;
          _cvsBackHdn.style.width  = _width + "px";
          _cvsBackHdn.style.height = _height + "px";
          _ctxBackHdn              = _cvsBackHdn.getContext ("2d");

          _cvsMainHdn              = document.createElement ('canvas');
          _cvsMainHdn.id           = "poochCvsMainHdn_" + _id;
          _cvsMainHdn.width        = _width;
          _cvsMainHdn.height       = _height;
          _cvsMainHdn.style.width  = _width + "px";
          _cvsMainHdn.style.height = _height + "px";
          _ctxMainHdn              = _cvsMainHdn.getContext ("2d");

          _layersHdn = [_cvsBackHdn, _cvsMainHdn];
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
        _ctxMainHlt      = pooch.fetch ("#pooch_highlightMain_" + _id).dom ().getContext ("2d");
        _ctxBackHlt      = pooch.fetch ("#pooch_highlightBack_" + _id).dom ().getContext ("2d");
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

    if (!arguments.length || typeof id === "undefined") return _chartScope;
    _chartScope.house (id);
    return _chartScope;
  };

  var __symbolGroup = function (shape)
  {
    var _symGrpScope = this;

    var _stepSwitch = function (sVal, eVal, time, dur, ease)
    {
      return eVal;
    };

    var _stepPoints = function (sPts, ePts, time, dur, ease)
    {
      return ePts;
    };

    var _stepColor = function (sCol, eCol, time, dur, ease)
    {
      if (!dur || dur === 1 || time === dur) return eCol;
      var sColSpl   = sCol.split (","),
          eColSpl   = eCol.split (","),
          interpR   = _stepInt (sColSpl[0]|0, eColSpl[0]|0, time, dur, ease) >> 0,
          interpG   = _stepInt (sColSpl[1]|0, eColSpl[1]|0, time, dur, ease) >> 0,
          interpB   = _stepInt (sColSpl[2]|0, eColSpl[2]|0, time, dur, ease) >> 0;

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
      if (typeof val === "undefined") return _attrs[attr];
      if (_dataObjExists (val)) _attrs[attr] = function (sym, data) { return data[val]; };
      else _attrs[attr] = val;
      _changeList[attr] = null;
      return _symGrpScope;
    };

    var _dataObjExists = function (val)
    {
      var firstKey = null;
      for (var first in _info.datum ()) { firstKey = first; break; }
      return (typeof val === "string" && typeof _info.datum (firstKey)[val] !== "undefined");
    };

    var _false = function (val) { return false; };

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

    _symGrpScope.shape                  = function (val) { return !arguments.length ? _attrs.shape : _false (_attrs.shape  = val) || _symGrpScope; };
    _symGrpScope.order                  = function (val) { return !arguments.length ? _order : _false (_order = val) || _symGrpScope; };
    _symGrpScope.layer                  = function (val) { return !arguments.length ? _layer : _false (_layer = val) || _symGrpScope; };
    _symGrpScope.easing                 = function (val) { return !arguments.length ? _attrs.easing : _false (_attrs.easing  = val) || _symGrpScope; };
    _symGrpScope.interactive            = function (val) { return !arguments.length ? _interactive : _false (_interactive = val) || _symGrpScope; };
    _symGrpScope.batch                  = function (val) { return !arguments.length ? _batch : _false (_batch = val) || _symGrpScope; };
    _symGrpScope.map                    = function (val) { return !arguments.length ? _map : _false (_map = val) || _symGrpScope; };
    _symGrpScope.context                = function (val) { return !arguments.length ? _ctx : _false (_ctx = val) || _symGrpScope; };
    _symGrpScope.changeList             = function (val) { return !arguments.length ? _changeList : _false (_changeList = val) || _symGrpScope; };
    _symGrpScope.customShape            = function (val) { return !arguments.length ? _customShape : _false (_customShape = val) || _symGrpScope; };
    _symGrpScope.frameCalculation       = function (val) { return !arguments.length ? _frameCalc : _false (_frameCalc  = val) || _symGrpScope; };

    _symGrpScope.sort = function (attr, bool)
    {
      if (_info)
      {
        _order.sort (function (b, a)
        {
          var sizeA = _symGrp[bool ? a : b][attr],
              sizeB = _symGrp[bool ? b : a][attr];
          return sizeB - sizeA;
        });
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
      for (var attr in obj) { _attrs[attr] = obj[attr]; }
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

    _symGrpScope.shapeData = function (val)
    {
      if (!arguments.length) return _shapeData;
      if (typeof val === "string") _shapeData = val;
      return _symGrpScope;
    };

    _symGrpScope.fillColor = function (val)
    {
      if (!arguments.length) return _attrs.fillColor;
      _attrs.fillColor = val;
      _batchMod = true;
      _changeList["fillColor"] = null;
      return _symGrpScope;
    };

    _symGrpScope.width = function (val)
    {
      if (!arguments.length) return _attrs.width;
      if (_dataObjExists (val))
      {
        _attrs.width = function (sym, data) { return data[val]; };
      }
      else _attrs.width = val;
      _changeList["width"] = null;
      return _symGrpScope;
    };

    _symGrpScope.height = function (val)
    {
      if (!arguments.length) return _attrs.height;
      if (_dataObjExists (val))
      {
        _attrs.height = function (sym, data) { return data[val]; };
      }
      else _attrs.height = val;
      _changeList["height"] = null;
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
        _attrs.x = function (sym, data) { return _fitFunc ({ dim: "width", val: data[val] }); };
      }
      else _attrs.x = function (sym, data) { return _fitFunc ({ dim: "width", val: val, sym: sym, data: data }); };
      _changeList["x"] = null;
      return _symGrpScope;
    };

    _symGrpScope.y = function (val)
    {
      if (!arguments.length) return _attrs.y;
      if (_dataObjExists (val))
      {
        _attrs.y = function (sym, data) { return _fitFunc ({ dim:"height", val: data[val] }); };
      }
      else _attrs.y = function (sym, data) { return _fitFunc ({ dim: "height", val: val, sym: sym, data: data }); };
      _changeList["y"] = null;
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
      _changeList["lat"] = null;
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
      _changeList["lng"] = null;
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
      _changeList["shapePoints"] = null;
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
      }

      return _symState;
    };

    var _symGrp      = {},
        _bounds      = [Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, Number.MAX_VALUE],
        //_boundsInView = {},
        _info        = null,
        _pop         = null,
        _ctx,
        _order       = [],
        _layer       = "main",
        _popup       = null,
        _unit        = "integer",
        _chart       = null,
        _fitFunc     = null,
        _batch       = false,
        _batchMod    = false,
        _frameCalc   = false,
        _customShape = null,
        _batchObj    = {},
        _interactive = false,
        _map         = null,
        _shapeData   = "",
        _changeList  = {},
        _funcQueue   = [],
        _symState    = {},
        _stepInt     = pooch.helpers.valueTween,
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

  var __zoomControl= function (elem)
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
        typeof document.getElementById (elem) !== "undefined")
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

  var __popup = function (elem)
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
      if (symGrp !== null && typeof symGrp !== "undefined") _symGrp = symGrp;
      if (data !== null && typeof data !== "undefined") _info = data;
      return _popupScope;
    };

    if (!arguments.length) return _popupScope;

    if (typeof elem === "string" &&
        document.getElementById (elem) !== null &&
        typeof document.getElementById (elem) !== "undefined")
    {
      _template = document.getElementById (elem);
      _domElem  = document.createElement ('div');
      _domElem.style.borderStyle = 'none';
      _domElem.style.borderWidth = '0px';
      _domElem.style.position    = 'absolute';
      _domElem.style.display     = 'block';
    }

    return _popupScope;
  };

  var __data = function (obj)
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
        _mouseIgnore   = false,
        _div           = null;

    _overlayScope.prototype = new google.maps.OverlayView ();

    var _dragStartEvent = function ()
    {
      _mouseIgnore = _chart.mouseIgnore ();
      _chart.activeSymbol (null);
    };

    var _dragEvent = function ()
    {
      //_bounds       = _map.getBounds ();
      _chart.mouseIgnore (true);

      var overProj  = _overlayScope.prototype.getProjection (),
          bounds    = _map.getBounds (),
          //mapNW     = new google.maps.LatLng (_bounds.getNorthEast ().lat (), _bounds.getSouthWest ().lng ()),
          //divPix    = overProj.fromLatLngToDivPixel (mapNW),
          curNW     = new google.maps.LatLng (bounds.getNorthEast ().lat (), bounds.getSouthWest ().lng ()),
          prevNW    = new google.maps.LatLng (_bounds.getNorthEast ().lat (), _bounds.getSouthWest ().lng ()),
          curPix    = overProj.fromLatLngToDivPixel (curNW),
          prevPix   = overProj.fromLatLngToDivPixel (prevNW),
          diffX     = curPix.x - prevPix.x >> 0,
          diffY     = curPix.y - prevPix.y >> 0;

      pooch.fetch (_chart.house ()).css ({ top: curPix.y + "px", left: curPix.x + "px" });
      _chart.refresh ({ x: diffX, y: diffY, width: _chart.width (), height: _chart.height () });
    };

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

      var symGrp = _mapObj.symbolGroup (),
          i = symGrp.length;

      while (i--)
      {
        if (symGrp[i].shapeData ()) symGrp[i].changeList ()["shapePoints"] = null;
        else { symGrp[i].changeList ()["lat"] = null; symGrp[i].changeList ()["lng"] = null; }
      }
      pooch.fetch (_chart.house ()).css ({ top: divPix.y + "px", left: divPix.x + "px", display: "block" });
      _mapObj.draw ();
      _mapObj.zoom (_map.getZoom ());
      _mapObj.zoomControl ().update ();
      if (_mouseIgnore) _chart.mouseIgnore (true);
      else _chart.mouseIgnore (false);
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

      google.maps.event.addListener (_map, 'dragstart', function () { _dragStartEvent (); });
      google.maps.event.addListener (_map, 'drag', function () { _dragEvent (); });
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

  var __fetch = function (elem)
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
      if (_domElem !== null && typeof _domElem !== "undefined")
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
          if (typeof _domElem.style !== "undefined")
          {
            for (var key in obj)
            {
              if (typeof _css2js[key] === "undefined") _domElem.style[camelize (key)] = obj[key];
              else _domElem.style[_css2js[key]] = obj[key];
            }
          }
        }
      }
      return _fetchScope;
    };

    _fetchScope.addClass = function (str)
    {
      _domElem.className += " " + str;
      return _domElem;
    };

    _fetchScope.cause = function (str)
    {
      if ((_domElem[str] || false) && typeof _domElem[str] === "function") _domElem[str] (_domElem);
      return _domElem;
    };

    _fetchScope.removeClass = function (str)
    {
      var currCls        = _domElem.className,
          re             = new RegExp ("(?:^|\\s)" + str + "(?!\\S)","g"),
          replace        = currCls.replace (re, "");
      _domElem.className = replace;
      return _domElem;
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

    if (!arguments.length || typeof elem === "undefined") return _fetchScope;

    if (typeof elem === "string")
    {
      if (elem.substr (0, 1) === "#") _domElem = document.getElementById (elem.substr (1, elem.length));
      else if (elem.substr (0, 1) === ".") _domElem = document.getElementsByClassName (elem.substr (1, elem.length))[0];
      else if (document.getElementById (elem) !== null && typeof document.getElementById (elem) !== "undefined") document.getElementById (elem);
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

    objectCount: function (obj)
    {
      var count = 0;
      for (var key in obj) { count++; }
      return count;
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

    valueTween: function (sPos, ePos, time, dur, ease)
    {
      var change  = ePos - sPos,
          locTime = time;

      if (!dur || dur === 1 || time === dur) return ePos;
      switch (ease) //Based on Robert Penner's Easing Functions
      {
        case "linear":
          return sPos + (change * (time / dur));
        case "easeIn":
          return change * (locTime /= dur) * locTime * locTime + sPos;
        case "easeOut":
          return change * ((locTime = time / dur - 1) * locTime * locTime + 1) + sPos;
        case "easeInOut":
          if ((locTime /= dur / 2) < 1) return change / 2 * locTime * locTime * locTime + sPos;
          return change / 2 * ((locTime -= 2) * locTime * locTime + 2) + sPos;
        default:
          return sPos + (change * (time / dur));
      }
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

        _pieScope.process = function (sym, offset)
        {
          var pieVars = _pieVars (sym);
          pieVars.ctx.beginPath ();
          pieVars.ctx.moveTo (sym.x + offset.x, sym.y + offset.y);
          pieVars.ctx.arc (sym.x + offset.x, sym.y + offset.y, sym.size, pieVars.sAngle, pieVars.eAngle, false);
          pieVars.ctx.closePath ();
          pieVars.ctx.fill ();
          pieVars.ctx.stroke ();
        };

        _pieScope.hitTest = function (sym, offset)
        {

          var pieVars   = _pieVars (sym),
              fromCntrX = sym.x + offset.x,
              fromCntrY = sym.y + offset.y,
              distCntr  = Math.sqrt (Math.pow (fromCntrX, 2) + Math.pow (fromCntrY , 2));

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
    },

    forceDirected: function (data) // Based on Fruchterman and Reingold and the JUNG implementation, modeled after David Piegza's work
    {
      var forceDirectedObj = function (field)
      {
        var _fdScope    = this,
            _nodes      = {},
            _edges      = {},
            _nodeIDs    = [],
            _edgeIDs    = [],
            _nodeLim    = 1000,
            _false      = function (val) { return false; },
            _attraction = 5,
            _repulsion  = 0.75,
            _iterations = 100000,
            _width      = 600,
            _height     = 600,
            _depth      = 2000,
            _done       = false,
            _callback   = null,
            _strain     = 0.000001,
            _itrCnt     = 0,
            _temp       = 0,
            _nodeLen    = 0,
            _edgeLen    = 0,
            _attract, _repulCon, _forceCon;

        _fdScope.attraction = function (val) { return !arguments.length ? _attraction : _false (_attraction = val) || _fdScope; };
        _fdScope.repulsion  = function (val) { return !arguments.length ? _repulsion  : _false (_repulsion = val)  || _fdScope; };
        _fdScope.iterations = function (val) { return !arguments.length ? _iterations : _false (_iterations = val) || _fdScope; };
        _fdScope.width      = function (val) { return !arguments.length ? _width      : _false (_width = val)      || _fdScope; };
        _fdScope.height     = function (val) { return !arguments.length ? _height     : _false (_height = val)     || _fdScope; };
        _fdScope.depth      = function (val) { return !arguments.length ? _depth      : _false (_depth = val)      || _fdScope; };
        _fdScope.done       = function (val) { return !arguments.length ? _done       : _false (_done = val)       || _fdScope; };
        _fdScope.nodes      = function (val) { return !arguments.length ? _nodes      : _false (_nodes = val)      || _fdScope; };
        _fdScope.edges      = function (val) { return !arguments.length ? _edges      : _false (_edges = val)      || _fdScope; };
        _fdScope.nodeIDs    = function (val) { return !arguments.length ? _nodeIDs    : _false (_nodeIDs = val)    || _fdScope; };
        _fdScope.edgeIDs    = function (val) { return !arguments.length ? _edgeIDs    : _false (_edgeIDs = val)    || _fdScope; };
        _fdScope.nodeLimit  = function (val) { return !arguments.length ? _nodeLim    : _false (_nodeLim = val)    || _fdScope; };

        _fdScope.edge = function (start, dest)
        {
          var edgeScope   = this;
          edgeScope.start = start;
          edgeScope.dest  = dest;
          edgeScope.data  = {};

          edgeScope.toLayout = function ()
          {
            if (edgeScope.start.connectTo (edgeScope.dest))
            {
              _edgeIDs.push (edgeScope.dest.id);
              _edges[edgeScope.dest.id] = edgeScope;
              return true;
            }
            return false;
          };
        };

        _fdScope.node = function (id)
        {
          var nodeScope       = this;
          nodeScope.id        = id;
          nodeScope.nodesTo   = [];
          nodeScope.nodesFrom = [];
          nodeScope.pos       = {};
          nodeScope.data      = {};

          nodeScope.connectTo = function (node)
          {
            if (!nodeScope.isConnected (node))
            {
              nodeScope.nodesTo.push (node);
              return true;
            }
            return false;
          };

          nodeScope.isConnected = function (node)
          {
            var i = nodeScope.nodesTo.length;

            while (i--)
            {
              var connNode = nodeScope.nodesTo[i];
              if (connNode.id == node.id) return true;
            }
            return false;
          };

          nodeScope.toLayout = function ()
          {
            if (typeof _nodes[nodeScope.id] === "undefined" && _nodeIDs.length <= _nodeLim)
            {
              _nodeIDs.push (nodeScope.id);
              _nodes[nodeScope.id] = nodeScope;
              return true;
            }
            return false;
          };
        };

      _fdScope.build = function ()
      {
        _done     = false;
        _temp     = _width / 10.0;
        _nodeLen  = _nodeIDs.length;
        _edgeLen  = _edgeIDs.length;
        _forceCon = Math.sqrt (_height * _width / _nodeLen);
        _attract  = _attraction * _forceCon;
        _repulCon = _repulsion * _forceCon;
      };

      _fdScope.update = function ()
      {
        var i = _nodeLen,
            k = _edgeLen,
            l = i;

        if (_itrCnt < _iterations && _temp > 0.000001)
        {
          while (i--)
          {
            var j          = i + 1,
                nodeVrt    = _nodes[_nodeIDs[i]];
            nodeVrt.layout = nodeVrt.layout || {};

            if (i === _nodeLen - 1)
            {
              nodeVrt.layout.offX = 0;
              nodeVrt.layout.offY = 0;
              nodeVrt.layout.offZ = 0;
            }

            nodeVrt.layout.force   = 0;
            nodeVrt.layout.tmpPosX = nodeVrt.layout.tmpPosX || nodeVrt.pos.x;
            nodeVrt.layout.tmpPosY = nodeVrt.layout.tmpPosY || nodeVrt.pos.y;
            nodeVrt.layout.tmpPosZ = nodeVrt.layout.tmpPosZ || nodeVrt.pos.z;

            while (j--)
            {
              var nodeHrz = _nodes[_nodeIDs[j]];

              if (i !== j)
              {
                nodeHrz.layout         = nodeHrz.layout || {};
                nodeHrz.layout.tmpPosX = nodeHrz.layout.tmpPosX || nodeHrz.pos.x;
                nodeHrz.layout.tmpPosY = nodeHrz.layout.tmpPosY || nodeHrz.pos.y;
                nodeHrz.layout.tmpPosZ = nodeHrz.layout.tmpPosZ || nodeHrz.pos.z;

                var delX    = nodeVrt.layout.tmpPosX - nodeHrz.layout.tmpPosX,
                    delY    = nodeVrt.layout.tmpPosY - nodeHrz.layout.tmpPosY,
                    delZ    = nodeVrt.layout.tmpPosZ - nodeHrz.layout.tmpPosZ,
                    delLen  = Math.max (_strain, Math.sqrt ((delX * delX) + (delY * delY))),
                    delLenZ = Math.max (_strain, Math.sqrt ((delZ * delZ) + (delY * delY))),
                    force   = (_repulCon * _repulCon) / delLen,
                    forceZ  = (_repulCon * _repulCon) / delLenZ;

                nodeVrt.layout.force += force;
                nodeHrz.layout.force += force;
                nodeVrt.layout.offX  += (delX / delLen)  * force;
                nodeVrt.layout.offY  += (delY / delLen)  * force;
                nodeVrt.layout.offZ  += (delZ / delLenZ) * forceZ;

                if (i === _nodeLen - 1)
                {
                  nodeHrz.layout.offX = 0;
                  nodeHrz.layout.offY = 0;
                  nodeHrz.layout.offZ = 0;
                }

                nodeHrz.layout.offX -= (delX / delLen)  * force;
                nodeHrz.layout.offY -= (delY / delLen)  * force;
                nodeHrz.layout.offZ -= (delZ / delLenZ) * forceZ;
              }
            }
          }

          while (k--)
          {
            var edge     = _edges[_edgeIDs[k]],
                eLaySrt  = edge.start.layout,
                eLayDst  = edge.dest.layout,
                eDltX    = eLaySrt.tmpPosX - eLayDst.tmpPosX,
                eDltY    = eLaySrt.tmpPosY - eLayDst.tmpPosY,
                eDltZ    = eLaySrt.tmpPosZ - eLayDst.tmpPosZ,
                eDltLen  = Math.max (_strain, Math.sqrt ((eDltX * eDltX) + (eDltY * eDltY))),
                eDltLenZ = Math.max (_strain, Math.sqrt ((eDltZ * eDltZ) + (eDltY * eDltY))),
                eFrc     = (eDltLen * eDltLen) / _attract,
                eFrcZ    = (eDltLenZ * eDltLenZ) / _attract;

            eLaySrt.eFrc -= eFrc;
            eLayDst.eFrc += eFrc;

            eLaySrt.offX -= (eDltX / eDltLen)  * eFrc;
            eLaySrt.offY -= (eDltY / eDltLen)  * eFrc;
            eLaySrt.offZ -= (eDltZ / eDltLenZ) * eFrcZ;

            eLayDst.offX += (eDltX / eDltLen)  * eFrc;
            eLayDst.offY += (eDltY / eDltLen)  * eFrc;
            eLayDst.offZ += (eDltZ / eDltLenZ) * eFrcZ;
          }

          while (l--)
          {
            var nodePos        = _nodes[_nodeIDs[l]],
                nodePosLay     = nodePos.layout,
                nodePosDelLen  = Math.max (_strain, Math.sqrt (nodePosLay.offX * nodePosLay.offX + nodePosLay.offY * nodePosLay.offY)),
                nodePosDelLenZ = Math.max (_strain, Math.sqrt (nodePosLay.offZ * nodePosLay.offZ + nodePosLay.offY * nodePosLay.offY));

            nodePosLay.tmpPosX += (nodePosLay.offX / nodePosDelLen) * Math.min (nodePosDelLen, _temp);
            nodePosLay.tmpPosY += (nodePosLay.offY / nodePosDelLen) * Math.min (nodePosDelLen, _temp);
            nodePosLay.tmpPosZ += (nodePosLay.offZ / nodePosDelLenZ) * Math.min (nodePosDelLenZ, _temp);

            nodePos.pos.x -= (nodePos.pos.x - nodePosLay.tmpPosX) / 10;
            nodePos.pos.y -= (nodePos.pos.y - nodePosLay.tmpPosY) / 10;
            nodePos.pos.z -= (nodePos.pos.z - nodePosLay.tmpPosZ) / 10;

            if (typeof _callback === "function")
            {
              _callback (nodePos);
            }
          }
          _temp *= (1 - (_itrCnt / _iterations));
          _itrCnt++;

        }
        else
        {
          _done = true;
          return false;
        }
        return true;
      };


      };

      return new forceDirectedObj (data);
    }

  };

  window.pooch_initMapAPIs = function ()
  {
    pooch_baseMap.loadMap ();
  };

  window.pooch_baseMap = null;
  var _isSafari        = (typeof (navigator.vendor) === "object" && navigator.vendor.indexOf ("Apple") !== -1) ? true : false,
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