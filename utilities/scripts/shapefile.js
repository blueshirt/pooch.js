(function ()
{
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) alert("browser does not support File API");

  shapefile = { version: "0.0.1" , author: "Jeremy White" };

  shapefile.load = function (str)
  {
    _shapes     = [];
    _fields     = [];
    _keys       = [];
    _cols       = [];
    _attrs      = [];
    _dbfRecOff  = 0;
    _dbfRecCnt  = 0;
    _dbfRecSize = 0;
    _dataView   = null;
    _dvParser   = null;
    _fileDbf    = null,
    _fileShp    = null;

    if (_sortDbfShp (str)) _loadDbf (_fileDbf);
    else pooch.log ("missing .dbf, .shp or both");
  };

  shapefile.shapes = function ()
  {
    return _shapes;
  };

  shapefile.fields = function ()
  {
    return _fields;
  };

  shapefile.keys = function ()
  {
    return _keys;
  };

  shapefile.records = function ()
  {
    return _attrs;
  };

  shapefile.callbackComplete = function (func)
  {
    if (!arguments.length) return _callback;
    _callback = func;
    return _callback;
  };

  var _sortDbfShp = function (str)
  {
    var files = document.getElementById (str).files,
        i     = files.length;
    while (i--)
    {
      var name   = files[i].name,
          dotNdx = name.length - 4;
      if (name.substr (dotNdx, 4) === ".dbf") _fileDbf = files[i];
      else if (name.substr (dotNdx, 4) === ".shp") _fileShp = files[i];
    }
    if (_fileDbf !== null && _fileShp !== null &&
        _fileDbf.name.substr (0, _fileDbf.name.length - 4) === _fileShp.name.substr (0, _fileShp.name.length - 4))
    {
      return true;
    }
    else return false;
  };

  var _loadDbf = function(file)
  {
    var reader = new FileReader();

    reader.onloadend = function(e)
    {
      var dv    = new DataView (e.target.result);
      _dvParser = new _parser (dv);

      _readDbfHeader ();

      for (var i = 0; i < _dbfRecCnt; i++)
      {
        var record = _readDbfRecord (i);
        _attrs.push(record);
      }

      _checkColVals ();
      _loadShp (_fileShp);
    };
    reader.onerror = function(e)
    {
      //console.log(e);
    };
    reader.readAsArrayBuffer(file);
  };

  var _readDbfHeader = function ()
  {
    _dvParser.isLittleEndian (true);
    _dvParser.skip (4);
    _dbfRecCnt  = _dvParser.getInt32 ();
    _dbfRecOff  = _dvParser.getInt16 () + 1;
    _dbfRecSize = _dvParser.getInt16 ();
    _dvParser.skip (20);

    while (_dvParser.getInt8 () !== 13)
    {
      _dvParser.skip (-1);
      var field = _readDbfField ();
      _cols.push (field);
      _fields.push (field.name);
      //if (field.typ === 67) _keys.push (field.name);
    }
  };

  var _readDbfField = function ()
  {
    var readToZero = function ()
    {
      var all = [],
          byt = null;

      while (byt = _dvParser.getInt8 ())
      {
        all[all.length] = String.fromCharCode (byt);
      }
      return all.join("");
    };

    var name = readToZero ();
    _dvParser.skip (10 - name.length);
    var typ  = _dvParser.getInt8 ();
    _dvParser.skip (4);
    var tLen = _dvParser.getInt8 (),
        len  = tLen === -2 ? 254 : tLen,
        dec  = _dvParser.getInt8 ();
    _dvParser.skip (14);

    return { name: name, len: len, typ: typ, dec: dec };
  };

  var _readDbfRecord = function (index)
  {
    //if (index > _dbfRecCnt) throw ({ success: false, message: "index out of dbf bounds" });

    _dvParser.position (_dbfRecOff + index * _dbfRecSize);
    _dvParser.isLittleEndian (true);

    var values   = [],
        dupes    = {};

    for (var i = 0; i < _cols.length; i++)
    {
      var str    = _dvParser.getString (_cols[i].len),
          result = null;

      if (_cols[i].typ === 78) // number
      {
        result = _cols[i].dec > 0 ? parseFloat (str, 10) : parseInt (str, 10);
      }
      else //string
      {
        var trim = str.trim ();
        result = trim === "" ? null : trim;
      }

      values[i] = result;
    }
    return values;
  };

  var _checkColVals = function ()
  {
    for (var i = 0; i < _cols.length; i++)
    {
      var dupes    = {},
          validKey = true;

      if (_cols[i].typ === 67) //string
      {
        for (var j = 0; j < _dbfRecCnt; j++)
        {
          var record = _attrs[j][i];
          if (record !== null && typeof dupes[record] === "undefined")
          {
            if (designer.main.checkObjName (record)) dupes[record] = true;
            else
            {
              dupes[record] = true;
              validKey = false;
            }
          }
          else validKey = false;
        }
      }
      else validKey = false;

      if (validKey) _keys.push (_fields[i]);
    }
  };


  //Shapes


  var _loadShp = function (file)
  {
    var reader = new FileReader();

    reader.onloadend = function(e)
    {
      var dv      = new DataView (e.target.result);
      _dvParser   = new _parser (dv);
      var shpType = _readShpHeader ();

      if (shpType === 3 || shpType === 5) // Polygon or polyline
      {
        _shapes = [];
        while (true)
        {
          try { _shapes.push(_readShpRecord ()); }
          catch (e)
          {
            if (!e.success) pooch.log (e.message);
            break;
          }
        }
      }

      if (typeof _callback === "function") _callback (_fileShp);
      else pooch.log ("no callback specified");
    };
    reader.onerror = function(e)
    {
      //console.log(e);
    };
    reader.readAsArrayBuffer(file);
  };

  var _readShpHeader = function ()
  {
    var sig = _dvParser.getInt32 ();

    if (sig === 9994)
    {
      _dvParser.skip (20);
      _dvParser.len (_dvParser.getInt32 () * 2);
      _dvParser.isLittleEndian (true);
      _dvParser.skip (4);
      var typ = _dvParser.getInt32 ();
      _dvParser.skip (64);
      return (typ);
    }
    else
    {
      //console.log ("signature is not recognized as a shapefile");
      return -1;
    }
  };

  var _readShpRecord = function ()
  {
    var bytesRem = _dvParser.len () - _dvParser.position ();
    if (bytesRem === 0) throw ({ success: true, message: "success" });
    if (bytesRem < 8) throw ({ success: false, message: "shape record too small" });
    _dvParser.skip (12);

    return _readShpPoly ();
  };

  var _readShpPoly = function ()
  {
    var rings   = [],
        removed = 0,
        shifted = null;

    if (_dvParser.len () - _dvParser.position () < 16) throw ({ success: false, message: "poly too small" });

    _dvParser.isLittleEndian (true);
    _dvParser.skip (32);

    var ringLen  = _dvParser.getInt32 (),
        pointLen = _dvParser.getInt32 (),
        ringOff = [];

    while (ringLen--) ringOff.push (_dvParser.getInt32 ());

    var points = [];
    while (pointLen--) points.push ([_dvParser.getFloat64 (), _dvParser.getFloat64 ()]); // Should test for size at some point. Must equal 16.

    ringOff.shift ();

    while (ringOff.length)
    {
      shifted = ringOff.shift ();
      rings.push (points.splice (0, shifted - removed));
      removed = shifted;
    }

    rings.push(points);

    return rings;
  };

  var _parser = function (dv)
  {
    var _dvScope = this,
        _dv      = dv,
        _pos     = 0,
        _len     = 0,
        _ltlEnd  = false;

    _dvScope.len = function (val)
    {
      if (!arguments.length) return _len;
      _len = val;
      return _dvScope;
    };

    _dvScope.skip = function (val)
    {
      if (!arguments.length) return _pos;
      _pos += val;
      return _dvScope;
    };

    _dvScope.position = function (val)
    {
      if (!arguments.length) return _pos;
      _pos = val;
      return _dvScope;
    };

    _dvScope.isLittleEndian = function (bool)
    {
      if (!arguments.length) return _ltlEnd;
      _ltlEnd = bool;
      return _dvScope;
    };

    _dvScope.getString = function (len)
    {
      var currPos = _pos,
          aStr    = [],
          count   = 0;

      for (var i = currPos; i < currPos + len; i++)
      {
        aStr[count] = String.fromCharCode(_dvScope.getInt8At (i));
        count++;
      }

      _pos += len;
      return aStr.join("");
    };

    _dvScope.getInt8At = function (index)
    {
      var val = _dv.getInt8 (index);
      return val;
    };

    _dvScope.getInt8 = function ()
    {
      var val = _dv.getInt8 (_pos);
      _pos++;
      return val;
    };

    _dvScope.getInt16 = function ()
    {
      var val = _dv.getInt16 (_pos, _ltlEnd);
      _pos += 2;
      return val;
    };

    _dvScope.getInt32 = function ()
    {
      var val = _dv.getInt32 (_pos, _ltlEnd);
      _pos += 4;
      return val;
    };

    _dvScope.getFloat64 = function ()
    {
      var val = _dv.getFloat64 (_pos, _ltlEnd);
      _pos += 8;
      return val;
    };
  };

  var _shapes     = [],
      _fields     = [],
      _keys       = [],
      _cols       = [],
      _attrs      = [],
      _fileShp    = null,
      _fileDbf    = null,
      _callback   = null,
      _dbfRecOff  = 0,
      _dbfRecCnt  = 0,
      _dbfRecSize = 0,
      _dataView   = null,
      _dvParser   = null;

})();