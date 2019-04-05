#!/usr/bin/env node
'use strict'

var process    = require('process')
var fs         = require('fs')
var linewrap   = require('linewrap')
var minimist   = require('minimist')
var path       = require('path')
var tildify    = require('tildify')
var stringHash = require('string-hash')
var colorpick  = require('./colorpick')
var cssColors  = require('./csscolors')
var util       = require('./util')
var _          = require('underscore')

util.globalize(util)

var wrap = linewrap(70, { skipScheme: 'ansi-color' })
var argopt = { alias: { a: 'all',  b: 'badge', c: 'color',
                        h: 'hash', t: 'title', p: 'pick',
                        del: 'delete', V: 'verbose' },
               'boolean': ['pwd', 'verbose', 'debug']
              }
var args = minimist(process.argv.slice(2), argopt)
const ARGS_DEBUG = args.debug
dprintln.display = args.debug
const cwd = process.cwd()
var defaultColorSpec = 'peru'
var colors = cssColors()
var allcolors = _.clone(colors) // remember even if deleted
var cssColorNames = _.keys(colors).sort()

updateColorMap('default', defaultColorSpec)

var configpath = path.join(process.env.HOME, '.tabset')
const defaultConfig = { colors: {
                          alisongreen: 'rgb(125,199,53)'
                        },
                        defaults: {
                          all: '.',
                          title: '.',
                          badge: '.',
                          color: '.'
                        }
                      }
var config = readJSON(configpath) || defaultConfig
interpretConfig(config)
process_args()


function process_args () {

  args.pwd ? println('dir:', cwd) : null;

  if (ARGS_DEBUG)
    console.log('args:', args)
  // help requested
  if (args.help) {
    println()
    println('To set an iTerm2 tab\'s color, badge, or title:')
    println()
    println('tabset --all|-a <string>')
    println('       --color|-c <named-color>')
    println('                  | <rgb()>')
    println('                  | <hex-color>')
    println('                  | random')
    println('                  | RANDOM')
    println('       --pick|-p')
    println('       --hash|-h <string>')
    println('       --badge|-b <string>')
    println('       --title|-t <string>')
    println('       --pwd')
    println('       --mode  0 | 1 | 2')
    println('       --init')
    println('       --add <name> <colorspec>')
    println('       --add <name> --pick|-p')
    println('       --del <name>')
    println('       --list')
    println('       --colors')
    println('       --help')
    println('       --verbose|-V')
    println()
  }


  const nFreeArgs = _.size(args._)
  // no real args given, so improvise
  var noSpecificArgs = (_.size(args) === (argopt['boolean'].length + 1 + 1));
      // always expect _ and booleans (e.g. pwd and verbose)
      // they do not count at "specific" arguments
  dprintln('noSpecificArgs:', jsonify(noSpecificArgs))
  if (!nFreeArgs && noSpecificArgs) {
    args.all = settingString(null, 'all')
    if (!args.all) {
      args.all = cwd
    }
    dprintln('set args.all to', args.all)
  }

  if (args.colors) {
    var colorNames = _.keys(colors).sort()
    println(wrap('named colors: ' + colorNames.join(', ')))
  }

  // combo set everthing
  if (nFreeArgs === 1) {
    args.all = settingString(args._[0], 'all')
  } else if (nFreeArgs > 1) {
    args.all = args._.join(' ')
  }
  if (ARGS_DEBUG) {
    console.log('nFreeArgs:', nFreeArgs)
    console.log('setting args.all to:' , args.all)
  }

  if (args.all) {
    setBadge(args.all)
    setTabTitle(args.all, definedOr(args.mode, 1))
    var col = decodeColorSpec(args.all)
    if (!col) {
      var colorNames = _.keys(colors).sort()
      var index = stringHash(args.all) % colorNames.length
      var hashColor = colorNames[index]
      col = colors[hashColor]
    }
    showChoice('picked color:', hashColor)
    setTabColor(col, definedOr(args.mode, 1))
  }

  if (args.badge) {
    var badge = settingString(args.badge, 'badge')
    setBadge(badge)
  }

  if (args.title) {
    var title = settingString(args.title, 'title')
    setTabTitle(title, definedOr(args.mode, 1))
  }

  if (args.hash && !args.color) {
    args.color = true
  }

  if (args.add) {
    if (!_.isString(args.add)) {
      errorExit('must give name to add')
    }
    if (args.pick) {
      colorpick({ targetApp: 'iTerm2'},
                function (res) {
                  addColor(args.add, rgbstr(res.rgb))
                  println('added:', args.add)
                })
    } else if (_.size(args._) === 1) {
      addColor(args.add, args._[0])
      println('added:', args.add)
    } else {
      errorExit('add what color?')
    }
  } else if (args.pick) {
    colorpick({ targetApp: 'iTerm2'},
              function (res) {
                println('picked:', rgbstr(res.rgb))
                setTabColor(res.rgb)
              })
  }

  if (args.del) {
    if (!_.isString(args.del)) {
      errorExit('must give name to delete')
    }
    delColor(args.del)
    println('deleted:', args.del)
  }

  if (args.list) {
    listColors()
  }

  if (args.color) {
    setTabColor(decodeColor(args.color))
  }

  if (args.init) {
    initConfigFile()
  }
}

/**
 * Interpret a color/title/badge setting string,
 * using a default value if need be.
 */
function settingString(s, category) {
  var finalS = s
  if ((s === true) || (!s)) {
    finalS = config.defaults[category]
  }
  if (ARGS_DEBUG)
    console.log('s:', s, 'finalS:', finalS, 'cwd:', cwd)
  if ((finalS === '~') || (finalS == process.env['HOME'])) {
    return tildify(cwd)
  } else if ((finalS === '.') || (finalS === cwd)){
    return path.basename(cwd)
  }
  if (ARGS_DEBUG)
    console.log('backup return')
  return finalS
}

/**
 * Add a color to the local definitions
 */
function addColor (name, spec) {
  config.colors[name] = spec
  writeJSON(configpath, config)
}

/**
 * Remove a color from use. If it's a base color, need
 * to mark it `null` in config file. Otherwise, no reason
 * to even keep it in the config file. Delete outright.
 */
function delColor (name) {
  if (_.contains(cssColorNames, name)) {
    config.colors[name] = null
  } else if (_.has(config.colors, name)) {
    delete config.colors[name]
  } else {
    errorExit('no such color', jsonify(name))
  }
  writeJSON(configpath, config)
}

/**
 * List out the custom colors.
 */
function listColors () {
  if (_.isEmpty(config.colors)) {
    println('no custom colors to list')
  } else {
    println()
    var namel = maxLength(config.colors)
    var swatchl = 9
    var nulled = []
    println(padRight('Name', namel + 1),
            padRight('Swatch', swatchl + 1),
            'Definition')
    _.each(config.colors, function (value, key) {
      if (!value) {
        nulled.push(key)
      } else {
        var rgb = decodeColorSpec(value)
        var swatch = swatchString(rgb, swatchl)
        println(padRight(key, namel + 1), swatch + ' ', value)
      }
    })
    if (nulled.length) {
      println()
      var nullplus = nulled.map(n => {
        var rgb = decodeColorSpec(n)
        return n + (rgb ? swatchString(rgb, 2) : '')
      })
      println(wrap('Nulled: ' + nullplus.join(', ')))
    }
    println()
  }
}

/**
 * Return a swatch (ANSI-colored string).
 * @param {Array of Integer} rgb - color as rgb values
 * @param {Integer} length - how wide?
 */
function swatchString (rgb, length) {
  return ansiseq2(`48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`,
                  padRight('', length))
}

/**
 * A low-level color spec decoder that handles only
 * the simple cases: A named color, rgb() spec, or
 * hex rgb spec.
 */
function decodeColorSpec (spec) {
  spec = spec.toString();  // in case not string already

  // exact match for existing named color?
  if (colors) {
    var color = allcolors[spec]
    if (color) {
      return color
    }
  }

  // match rgb(r, g, b)
  var rgbmatch = spec.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (rgbmatch) {
    return [ parseInt(rgbmatch[1]),
             parseInt(rgbmatch[2]),
             parseInt(rgbmatch[3]) ]
  }

  // match #fa21b4
  var hexmatch = spec.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i)
  if (hexmatch) {
    return [ parseInt(hexmatch[1], 16),
             parseInt(hexmatch[2], 16),
             parseInt(hexmatch[3], 16) ]
  }

  // failed to decode
  return null
}

/**
 * A high-level color decoder that handles the complex,
 * UI-entangled cases such as random colors, hashed colors,
 * partial string search, and defaults. By delegation to
 * decodeColorSpec(), also handles the simpler cases of
 * exactly named colors and rgb() or hex CSS color definitions.
 */
function decodeColor (name) {
  if (_.isArray(name)) {  // predecoded!
    return name
  }
  if (name === null) {    // not in use
    return name
  }

  var colorNames = _.keys(colors).sort()

  if (!_.isString(name)) {
    // --color invoked, but no color specified

    // might be a hashed color request
    if (args.hash) {
      var index = stringHash(args.hash) % colorNames.length
      var hashColor = colorNames[index]
      showChoice('hashed color:', hashColor)
      return colors[hashColor]
    }

    // nope, no hash; so pick something at random
    name = 'random'
  }

  // random named color
  if (name === 'random') {
    var randColor = _.sample(colorNames)
    showChoice('random color:', randColor)
    return colors[randColor]
  }

  // RANDOM color - not just a random named color
  if (name === 'RANDOM') {
    var rcolor = [_.random(255), _.random(255), _.random(255) ]
    showChoice('RANDOM color:', rgbstr(rcolor))
    return rcolor
  }

  // try a low level spec
  name = name.toLowerCase()
  var defn = decodeColorSpec(name)
  if (defn) {
    return defn
  }

  // finally, a string containment search
  if (colorNames) {
    var possibles = colorNames.filter(s => {
      return s.indexOf(name) >= 0
    })
    if (possibles.length === 1) {
      showChoice('guessing:', possibles[0])
      return colors[possibles[0]]
    }  else if (possibles.length > 1) {
      println(wrap('possibly: ' + possibles.join(', ')))
      var rcolor = _.sample(possibles)
      showChoice('randomly picked:', rcolor)
      return colors[rcolor]
    }
  }

  // nothing worked, use default color
  showChoice('using default:', defaultColorSpec)
  println('because no color', jsonify(name), 'known')
  println('use --colors option to list color names')
  return colors['default']
}

/**
 * Show a given color choice. Print the current working
 * directory if global args says so.
 */
function showChoice (label, value) {
  if (args.vervise && label && value) {
    println(label, value)
  }
}

/**
 * Format a three-element rgb araay into a CSS-style
 * rgb specification.
 */
function rgbstr (rgbarray) {
  return [ 'rgb(', rgbarray.join(','), ')'].join('')
}

/**
 * Set the tab or window color of the topmost iTerm2 tab/window.
 *
 * @param {Array of int} color RGB colors to set.
 */
function setTabColor (color) {
  var cmd = ansiseq('6;1;bg;red;brightness;',   color[0]) +
            ansiseq('6;1;bg;green;brightness;', color[1]) +
            ansiseq('6;1;bg;blue;brightness;',  color[2])
  print(cmd)
}

/**
 * Set the title of the topmost iTerm2 tab.
 *
 * @param {string} title
 * @param {int} mode 0 => tab title and window title,
 *                   1 => tab title, 2 => window title
 */
function setTabTitle (title, mode) {
  var cmd = ansiseq(mode, ';', title)
  print(cmd)
}

/**
 * Set the badge of the topmost iTerm2 tab.
 *
 * @param {string} msg
 */
function setBadge (msg) {
  msg += '\u00a0' // give some right spacing
  var msg64 = Buffer.from(msg.toString()).toString('base64')
  var cmd = ansiseq('1337;SetBadgeFormat=', msg64)
  print(cmd)
}

/**
 * Many of iTterm2's command sequences begin with an ESC ] and end with a
 * BEL (Ctrl-G). This function returns its arguments wrapped
 * in those start/stop codes.
 */
function ansiseq () {
  var parts = _.flatten(['\u001b]', _.toArray(arguments), '\u0007'])
  return parts.join('')
}

/**
 * Other iTterm2 command sequences are slightly differently structured.
 * This function returns its arguments wrapped
 * in those start/stop codes.
 */
function ansiseq2 () {
  var parts = _.flatten(['\u001b[', _.toArray(arguments), '\u001b[0m'])
  return parts.join('')
}

function interpretConfig (config) {
  _.each(config.colors, function (spec, key) {
    if (key === 'default') {
      defaultColorSpec = spec  // might be name or value
    }
    updateColorMap(key, spec)
  })
}

/**
 * Write a suitable default configuration file
 */
function initConfigFile () {
  if (fs.existsSync(configpath)) {
    errorExit('config file already exists')
  }

  var sample = {
    colors: {
      alisongreen: 'rgb(125,199,53)',
      js: 'orchid',
      html: 'gold',
      server: 'alisongreen',
      papayawhip: null
    }
  }

  writeJSON(configpath, sample)
}

/**
 * Update the existing color map, either by
 * adding decoded color specs or deleting entries.
 */
function updateColorMap (key, value) {
  if (value === null) {
    delete colors[key]
  } else {
    var rgb = decodeColorSpec(value)
    colors[key] = rgb
    allcolors[key] = rgb
  }
}