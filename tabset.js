#!/usr/bin/env node
'use strict';

var process    = require('process'),
    fs         = require('fs'),
    linewrap   = require('linewrap'),
    minimist   = require('minimist'),
    path       = require('path'),
    tildify    = require('tildify'),
    stringHash = require('string-hash'),
    colorpick  = require('./colorpick'),
    cssColors  = require('./csscolors'),
    util       = require('./util'),
    _          = require('underscore');

util.globalize(util);

var wrap = linewrap(70, {skipScheme: 'ansi-color'}),
    argopt = {alias: { a: 'all', b:'badge', c:'color',
                       h:'hash', t:'title', p: 'pick',
                       del: 'delete'} },
    args = minimist(process.argv.slice(2), argopt);

var defaultColorSpec = 'peru',
    colors = cssColors(),
    allcolors = _.clone(colors), // remember even if deleted
    cssColorNames = _.keys(colors).sort();

updateColorMap('default', defaultColorSpec);

var configpath = path.join(process.env.HOME, '.tabset'),
    config = readJSON(configpath) || { colors: {} };
interpretConfig(config);
process_args();


function process_args() {

  // help requested
  if (args.help) {
    println()
    println("To set an iTerm2 tab's color, badge, or title:")
    println()
    println("tabset --all|-a <string>")
    println("       --color|-c <named-color>")
    println("                  | <rgb()>")
    println("                  | <hex-color>")
    println("                  | random")
    println("                  | RANDOM")
    println("       --pick|-p")
    println("       --hash|-h <string>");
    println("       --badge|-b <string>");
    println("       --title|-t <string>");
    println("       --mode  0 | 1 | 2");
    println("       --init")
    println("       --add <name> <colorspec>");
    println("       --add <name> --pick|-p");
    println("       --del <name>");
    println("       --list");
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
        var hashColor = colorNames[index];
        println("picked color:", hashColor);
        col = colors[hashColor];
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

  if (args.add) {
    if (!_.isString(args.add)) {
      errorExit('must give name to add')
    }
    if (args.pick)
      colorpick({ targetApp: "iTerm2"},
              function(res){
                addColor(args.add, rgbstr(res.rgb));
                println("added:",args.add)
              });
    else if (_.size(args._) == 1) {
      addColor(args.add, args._[0]);
      println("added:", args.add);
    }
    else {
      errorExit("add what color?");
    }
  }
  else if (args.pick) {
    colorpick({ targetApp: "iTerm2"},
              function(res){
                println("picked:", rgbstr(res.rgb));
                setTabColor(res.rgb);
              });
  }

  if (args.del) {
    if (!_.isString(args.del)) {
      errorExit('must give name to delete')
    }
    delColor(args.del);
    println("deleted:", args.del);
  }

  if (args.list)
    listColors();

  if (args.color)
    setTabColor(decodeColor(args.color));

  if (args.init)
    initConfigFile();
}


/**
 * Add a color to the local definitions
 */
function addColor(name, spec) {
  config.colors[name] = spec;
  writeJSON(configpath, config);
}


/**
 * Remove a color from use. If it's a base color, need
 * to mark it `null` in config file. Otherwise, no reason
 * to even keep it in the config file. Delete outright.
 */
function delColor(name) {
  if (_.contains(cssColorNames, name))
    config.colors[name] = null;
  else if (_.has(config.colors, name))
    delete config.colors[name];
  else
    errorExit('no such color', JSON.stringify(name));
  writeJSON(configpath, config);
}


/**
 * List out the custom colors.
 */
function listColors() {
  if (_.isEmpty(config.colors))
    println("no custom colors to list")
  else {
    println();
    var namel = maxLength(config.colors),
        swatchl = 9,
        nulled = [];
    println(padRight("Name", namel+1),
            padRight("Swatch", swatchl+1),
            "Definition")
    _.each(config.colors, function(value, key){
      if (!value)
        nulled.push(key);
      else {
        var rgb = decodeColorSpec(value),
            swatch = swatchString(rgb, swatchl);
        println(padRight(key, namel+1), swatch + ' ', value);
      }
    });
    if (nulled.length) {
      println();
      var nullplus = nulled.map(n => {
        var rgb = decodeColorSpec(n);
        return n + (rgb ? swatchString(rgb, 2) : "");
      });
      println(wrap("Nulled: " + nullplus.join(", ")));
    }
    println();
  }
}


/**
 * Return a swatch (ANSI-colored string).
 * @param {Array of Integer} rgb - color as rgb values
 * @param {Integer} length - how wide?
 */
function swatchString(rgb, length) {
  return ansiseq2(`48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`,
                  padRight('', length));
}


/**
 * A low-level color spec decoder that handles only
 * the simple cases: A named color, rgb() spec, or
 * hex rgb spec.
 */
function decodeColorSpec(spec) {

  // exact match for existing named color?
  if (colors) {
    var color = allcolors[spec];
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
    println("RANDOM color:", rgbstr(rcolor));
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
 * Format a three-element rgb araay into a CSS-style
 * rgb specification.
 */
function rgbstr(rgbarray) {
  return [ 'rgb(', rgbarray.join(','), ')'].join('');
}


/**
 * Set the tab or window color of the topmost iTerm2 tab/window.
 *
 * @param {Array of int} color RGB colors to set.
 */
function setTabColor(color) {
  var cmd = ansiseq('6;1;bg;red;brightness;',   color[0]) +
            ansiseq('6;1;bg;green;brightness;', color[1]) +
            ansiseq('6;1;bg;blue;brightness;',  color[2]);
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
 * Many of iTterm2's command sequences begin with an ESC ] and end with a
 * BEL (Ctrl-G). This function returns its arguments wrapped
 * in those start/stop codes.
 */
function ansiseq() {
  var parts = _.flatten(['\u001b]', _.toArray(arguments), '\u0007']);
  return parts.join('');
}


/**
 * Other iTterm2 command sequences are slightly differently structured.
 * This function returns its arguments wrapped
 * in those start/stop codes.
 */
function ansiseq2() {
  var parts = _.flatten(['\u001b[', _.toArray(arguments), '\u001b[0m']);
  return parts.join('');
}


function interpretConfig(config) {
  _.each(config.colors, function(spec, key) {
      if (key == 'default')
        defaultColorSpec = spec; // might be name or value
      updateColorMap(key, spec);
    });
}

/**
 * Write a suitable default configuration file
 */
function initConfigFile() {

  if (fs.existsSync(configpath)) {
    errorExit("config file already exists");
  }

  var sample = {
      "colors": {
      "alisongreen": "rgb(125,199,53)",
      "js": "orchid",
      "html": "gold",
      "server": "alisongreen",
      "papayawhip": null
    }
  };

  writeJSON(configpath, sample);
}


/**
 * Update the existing color map, either by
 * adding decoded color specs or deleting entries.
 */
function updateColorMap(key, value) {
  if (value === null)
    delete colors[key];
  else {
    var rgb = decodeColorSpec(value);
    colors[key] = rgb;
    allcolors[key] = rgb;
  }
}
