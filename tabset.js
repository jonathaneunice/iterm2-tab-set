#!/usr/bin/env node
'use strict';

var process    = require('process'),
    fs         = require('fs'),
    linewrap   = require('linewrap'),
    minimist   = require('minimist'),
    path       = require('path'),
    tildify    = require('tildify'),
    stringHash = require('string-hash'),
    _          = require('underscore');

var wrap = linewrap(70),
    argopt = {alias: { a: 'all', b:'badge', c:'color',
                       h:'hash', t:'title'} },
    args = minimist(process.argv.slice(2), argopt),
    defaultColorSpec = 'peru',
    colors = baseColorMap();

updateColorMap('default', defaultColorSpec);
readConfigFile();
process_args();

function process_args() {

  // help requested
  if (args.help) {
    println()
    println("To set an iTerm2 tab's color, badge, or title:")
    println()
    println("tabset --all|-a <string>")
    println("       --color <named-color>")
    println("               | <rgb()>")
    println("               | <hex-color>")
    println("               | random")
    println("               | RANDOM")
    println("       --hash <string>");
    println("       --badge <string>");
    println("       --title <string>");
    println("       --mode  0 | 1 | 2");
    println("       --colors");
    println("       --help");
    println()
  }

  // no real args given, so improvise
  if ((_.size(args) == 1) && _.isEmpty(args._)) {
    args.all = tildify(process.cwd());
  }

  if (args.colors) {
    var colorNames = _.keys(colors).sort();
    println(wrap("named colors: " + colorNames.join(', ')));
  }

  // combo set everthing
  if (_.size(args._) > 0)
    args.all = args._.join(' ');

  if (args.all) {
    setBadge(args.all);
    setTabTitle(args.all, definedOr(args.mode, 1))
    var col = decodeColorSpec(args.all);
    if (!col) {
        var colorNames = _.keys(colors).sort();
        var index = stringHash(args.all) % colorNames.length;
        col = colors[colorNames[index]];
    }
    setTabColor(col, definedOr(args.mode, 1));
  }

  if (args.badge) {
    var badge = _.isString(args.badge)
                ? args.badge
                : tildify(process.cwd());
    setBadge(badge);
  }

  if (args.title) {
    var title = _.isString(args.title)
                ? args.title
                : path.basename(process.cwd());
    setTabTitle(title, definedOr(args.mode, 1))
  }

  if (args.hash && !args.color)
    args.color = true;

  if (args.color) {
    setTabColor(decodeColor(args.color), definedOr(args.mode, 1));
    // does mode matter for color setting?
  }
}


/**
 * If `value` is `undefined`, return `defaultValue`.
 * Else return `value`. Helps set defaults, and shortens
 * long boilerplate ternary assignments. Useful where simple
 * `||` alternation doesn't work well (because 0 or other
 * falsey values are legit).
 */
function definedOr(value, defaultValue) {
  return (value === undefined)
      ? defaultValue
      : value;
}


/**
 * A low-level color spec decoder that handles only
 * the simple cases: A named color, rgb() spec, or
 * hex rgb spec.
 */
function decodeColorSpec(spec) {

  // exact match for existing named color?
  if (colors) {
    var color = colors[spec];
    if (color) return color;
  }

  // match rgb(r, g, b)
  var rgbmatch = spec.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbmatch) {
    return [ parseInt(rgbmatch[1]),
             parseInt(rgbmatch[2]),
             parseInt(rgbmatch[3]) ]
  }

  // match #fa21b4
  var hexmatch = spec.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
  if (hexmatch) {
    return [ parseInt(hexmatch[1], 16),
             parseInt(hexmatch[2], 16),
             parseInt(hexmatch[3], 16) ]
  }

  // failed to decode
  return null;
}


/**
 * A high-level color decoder that handles the complex,
 * UI-entangled cases such as random colors, hashed colors,
 * partial string search, and defaults. By delegation to
 * decodeColorSpec(), also handles the simpler cases of
 * exactly named colors and rgb() or hex CSS color definitions.
 */
function decodeColor(name) {
  if (_.isArray(name)) return name;  // predecoded!
  if (name === null) return name;    // not in use

  var colorNames = _.keys(colors).sort();

  if (!_.isString(name)) {
    // --color invoked, but no color specified

    // might be a hashed color request
    if (args.hash) {
      var index = stringHash(args.hash) % colorNames.length;
      var hashColor = colorNames[index];
      println("hashed color:", hashColor);
      return colors[hashColor];
    }

    // nope, no hash; so pick something at random
    name = "random";
  }

  // random named color
  if (name == "random") {
    var randColor = _.sample(colorNames);
    println("random color:", randColor)
    return colors[randColor];
  }

  // RANDOM color - not just a random named color
  if (name == "RANDOM") {
    var rcolor = [_.random(255), _.random(255), _.random(255) ];
    var rgbstr = [ 'rgb(', rcolor.join(','), ')'].join('');
    println("RANDOM color:", rgbstr);
    return rcolor;
  }

  // try a low level spec
  name = name.toLowerCase();
  var defn = decodeColorSpec(name);
  if (defn) return defn;

  // finally, a string containment search
  if (colorNames) {
    var possibles = colorNames.filter(function(s){
      return s.indexOf(name) >= 0;
    });
    if (possibles.length == 1) {
      println("guessing:", possibles[0]);
      return colors[possibles[0]];
    }
    else if (possibles.length > 1) {
      println(wrap("possibly: " + possibles.join(", ")));
      var rcolor = _.sample(possibles);
      println("randomly picked:", rcolor);
      return colors[rcolor];
    }
  }

  // nothing worked, use default color
  println("no color", JSON.stringify(name), "known");
  println("using default:", defaultColorSpec);
  println("use --colors option to list color names");
  return colors["default"];
}


/**
 * Set the tab or window color of the topmost iTerm2 tab/window.
 *
 * @param {Array of int} color RGB colors to set.
 * @param {int} mode
 */
function setTabColor(color, mode) {
  var cmd = ansiseq('6;', mode, ';bg;red;brightness;',   color[0]) +
            ansiseq('6;', mode, ';bg;green;brightness;', color[1]) +
            ansiseq('6;', mode, ';bg;blue;brightness;',  color[2]);
  print(cmd);
}


/**
 * Set the title of the topmost iTerm2 tab.
 *
 * @param {string} title
 * @param {int} mode 0 => tab title and window title,
 *                   1 => tab title, 2 => window title
 */
function setTabTitle(title, mode) {
  var cmd = ansiseq(mode, ';', title);
  print(cmd)
}

/**
 * Set the badge of the topmost iTerm2 tab.
 *
 * @param {string} msg
 */
function setBadge(msg) {
  var msg64 = new Buffer(msg.toString()).toString('base64'),
      cmd = ansiseq('1337;SetBadgeFormat=', msg64);
  print(cmd)
}


/**
 * ANSI command sequences begin with an ESC ] and end with a
 * BEL (Ctrl-G). This function returns its arguments wrapped
 * in those start/stop codes.
 */
function ansiseq() {
  var parts = _.flatten(['\u001b]', _.toArray(arguments), '\u0007']);
  return parts.join('');
}


/**
 * Print arguments to stdout. Like Python's print, separates
 * arguments with spaces. No trailing newline.
 */
function print() {
  var msg = _.toArray(arguments).join(' ');
  process.stdout.write(msg);
}

/**
 * Print arguments to stdout. Like Python, separates arguments
 * with spaces. Adds trailing newline.
 */
function println() {
  var msg = _.toArray(arguments).concat("\n").join(' ');
  process.stdout.write(msg);
}

/**
 * Read and interpret the configuration file, ~/.tabset
 */
function readConfigFile() {
  var fpath = path.join(process.env.HOME, '.tabset');
  try {
    var config = JSON.parse(fs.readFileSync(fpath));
    _.each(config.colors, function(spec, key) {
      if (key == 'default')
        defaultColorSpec = spec; // might be name or value
      updateColorMap(key, spec);
    });
  } catch (e) {
    console.log("ERROR:", e);
    return {};
  }
}


/**
 * Update the existing color map, either by
 * adding decoded color specs or deleting entries.
 */
function updateColorMap(key, value) {
  if (value === null)
    delete colors[key];
  else
    colors[key] = decodeColorSpec(value);
}


/**
 * Returns map of the known CSS color names
 * to RGB color values.
 */
function baseColorMap() {
  return {
    aliceblue:      [240,248,255],
    antiquewhite:   [250,235,215],
    aqua:           [0,255,255],
    aquamarine:     [127,255,212],
    azure:          [240,255,255],
    beige:          [245,245,220],
    bisque:         [255,228,196],
    black:          [0,0,0],
    blanchedalmond: [255,235,205],
    blue:           [0,0,255],
    blueviolet:     [138,43,226],
    brown:          [165,42,42],
    burlywood:      [222,184,135],
    cadetblue:      [95,158,160],
    chartreuse:     [127,255,0],
    chocolate:      [210,105,30],
    coral:          [255,127,80],
    cornflowerblue: [100,149,237],
    cornsilk:       [255,248,220],
    crimson:        [220,20,60],
    cyan:           [0,255,255],
    darkblue:       [0,0,139],
    darkcyan:       [0,139,139],
    darkgoldenrod:  [184,134,11],
    darkgray:       [169,169,169],
    darkgreen:      [0,100,0],
    darkgrey:       [169,169,169],
    darkkhaki:      [189,183,107],
    darkmagenta:    [139,0,139],
    darkolivegreen: [85,107,47],
    darkorange:     [255,140,0],
    darkorchid:     [153,50,204],
    darkred:        [139,0,0],
    darksalmon:     [233,150,122],
    darkseagreen:   [143,188,143],
    darkslateblue:  [72,61,139],
    darkslategray:  [47,79,79],
    darkslategrey:  [47,79,79],
    darkturquoise:  [0,206,209],
    darkviolet:     [148,0,211],
    deeppink:       [255,20,147],
    deepskyblue:    [0,191,255],
    dimgray:        [105,105,105],
    dimgrey:        [105,105,105],
    dodgerblue:     [30,144,255],
    firebrick:      [178,34,34],
    floralwhite:    [255,250,240],
    forestgreen:    [34,139,34],
    fuchsia:        [255,0,255],
    gainsboro:      [220,220,220],
    ghostwhite:     [248,248,255],
    gold:           [255,215,0],
    goldenrod:      [218,165,32],
    gray:           [128,128,128],
    green:          [0,128,0],
    greenyellow:    [173,255,47],
    grey:           [128,128,128],
    honeydew:       [240,255,240],
    hotpink:        [255,105,180],
    indianred:      [205,92,92],
    indigo:         [75,0,130],
    ivory:          [255,255,240],
    khaki:          [240,230,140],
    lavender:       [230,230,250],
    lavenderblush:  [255,240,245],
    lawngreen:      [124,252,0],
    lemonchiffon:   [255,250,205],
    lightblue:      [173,216,230],
    lightcoral:     [240,128,128],
    lightcyan:      [224,255,255],
    lightgoldenrodyellow: [250,250,210],
    lightgray:      [211,211,211],
    lightgreen:     [144,238,144],
    lightgrey:      [211,211,211],
    lightpink:      [255,182,193],
    lightsalmon:    [255,160,122],
    lightseagreen:  [32,178,170],
    lightskyblue:   [135,206,250],
    lightslategray: [119,136,153],
    lightslategrey: [119,136,153],
    lightsteelblue: [176,196,222],
    lightyellow:    [255,255,224],
    lime:           [0,255,0],
    limegreen:      [50,205,50],
    linen:          [250,240,230],
    magenta:        [255,0,255],
    maroon:         [128,0,0],
    mediumaquamarine: [102,205,170],
    mediumblue:     [0,0,205],
    mediumorchid:   [186,85,211],
    mediumpurple:   [147,112,219],
    mediumseagreen: [60,179,113],
    mediumslateblue: [123,104,238],
    mediumspringgreen: [0,250,154],
    mediumturquoise: [72,209,204],
    mediumvioletred: [199,21,133],
    midnightblue:   [25,25,112],
    mintcream:      [245,255,250],
    mistyrose:      [255,228,225],
    moccasin:       [255,228,181],
    navajowhite:    [255,222,173],
    navy:           [0,0,128],
    oldlace:        [253,245,230],
    olive:          [128,128,0],
    olivedrab:      [107,142,35],
    orange:         [255,165,0],
    orangered:      [255,69,0],
    orchid:         [218,112,214],
    palegoldenrod:  [238,232,170],
    palegreen:      [152,251,152],
    paleturquoise:  [175,238,238],
    palevioletred:  [219,112,147],
    papayawhip:     [255,239,213],
    peachpuff:      [255,218,185],
    peru:           [205,133,63],
    pink:           [255,192,203],
    plum:           [221,160,221],
    powderblue:     [176,224,230],
    purple:         [128,0,128],
    rebeccapurple:  [102, 51, 153],
    red:            [255,0,0],
    rosybrown:      [188,143,143],
    royalblue:      [65,105,225],
    saddlebrown:    [139,69,19],
    salmon:         [250,128,114],
    sandybrown:     [244,164,96],
    seagreen:       [46,139,87],
    seashell:       [255,245,238],
    sienna:         [160,82,45],
    silver:         [192,192,192],
    skyblue:        [135,206,235],
    slateblue:      [106,90,205],
    slategray:      [112,128,144],
    slategrey:      [112,128,144],
    snow:           [255,250,250],
    springgreen:    [0,255,127],
    steelblue:      [70,130,180],
    tan:            [210,180,140],
    teal:           [0,128,128],
    thistle:        [216,191,216],
    tomato:         [255,99,71],
    turquoise:      [64,224,208],
    violet:         [238,130,238],
    wheat:          [245,222,179],
    white:          [255,255,255],
    whitesmoke:     [245,245,245],
    yellow:         [255,255,0],
    yellowgreen:    [154,205,50]
  };
}
