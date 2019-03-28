'use strict'

const _       = require('underscore')
const fs      = require('fs')
const process = require('process')
const path    = require('path')

/**
 * Given an export object ("module") `e`,
 * promote its keys to the global context.
 * If an optional list of keys is given
 * (in wsv or Array form), promote just those
 * keys.
 */
function globalize (e, just) {
  // determine the global context
  var _global
  if (typeof window !== 'undefined') {
    _global = window
  } else {
    _global = (typeof global === 'undefined')
                ? GLOBAL
                : global
  }

  // parse wsv just array, if needed
  if (just && (typeof just === 'string')) {
    just = just.trim().split(/\s+/)
  }

  // put each key of the given export object into the
  // global context (optionally limited by just)
  Object.keys(e).forEach(function (k) {
    if (!just || (just.indexOf(k) >= 0)) {
      _global[k] = e[k]
    }
  })
}

/**
 * If `value` is `undefined`, return `defaultValue`.
 * Else return `value`. Helps set defaults, and shortens
 * long boilerplate ternary assignments. Useful where simple
 * `||` alternation doesn't work well (because 0 or other
 * falsey values are legit).
 */
function definedOr (value, defaultValue) {
  return (value === undefined)
      ? defaultValue
      : value
}

/**
 * Return the maximum length of a collection of strings.
 * The collection may be an array or an object. If an object,
 * uses the object keys. (To find the max length of the object's
 * values, compute a list of values first.)
 */
function maxLength (o) {
  var strings = _.isArray(o) ? o : _.keys(o)
  if (!_.size(strings)) {
    return 0
  }
  return _.max(strings.map(s => s.length))

  // equivalent to `longest(o).length`
}

/**
 * Return the longest string in the given object. Like
 * maxLength(), but returns the actual string.
 */
function longest (o) {
  var strings = _.isArray(o) ? o : _.keys(o)
  if (!_.size(strings)) {
    return null
  }
  return _.max(strings, s => s.length)
}

/**
 * Pad a string on the right to reach the desired
 * width. Note: Does no truncation if the string is
 * already wider than the desired width.
 *
 * @param {String} str      String to pad.
 * @param {int}    width    Desired string width.
 * @param {String} padding  Padding character (default space).
 */
function padRight (str, width, padding) {
  var len = str.length
  return (width <= len)
    ? str
    : str + Array(width - len + 1).join(padding || ' ')
}

/**
 * Print arguments to stdout. Like Python's print, separates
 * arguments with spaces. No trailing newline.
 */
function print () {
  var msg = _.toArray(arguments).join(' ')
  process.stdout.write(msg)
}

/**
 * Print arguments to stdout. Like Python, separates arguments
 * with spaces. Adds trailing newline.
 */
function println () {
  var msg = _.toArray(arguments).join(' ') + '\n'
  process.stdout.write(msg)
}

/**
 * Debug version of println. Prints only when display value set
 * to something truthy, so by default, is a no-op. (However, it's
 * a function not a macro, so any side-effects or performance hit
 * to constructing its arguments will still be in effect.)
 */
function dprintln () {
  if (!dprintln.display) return
  var msg = _.toArray(arguments).join(' ') + '\n'
  process.stdout.write(msg)
}

/**
 * Return the JSON.stringify version of a value. Primary virtue
 * is a shorter (half-length) name for use in print function calls.
 * Does not do fancy indentation.
 */
function jsonify (value, indent=null) {
  return JSON.stringify(value, null, indent)
}

/**
 * Println to stderr.
 */
function error () {
  var msg = _.toArray(arguments).join(' ') + '\n'
  process.stderr.write(msg)
}

/**
 * Println to stderr, then quit.
 */
function errorExit () {
  var msg = _.toArray(arguments).join(' ') + '\n'
  process.stderr.write(msg)
  process.exit(1)
}

/**
 * Read a JSON file. Return the result. Returns
 * `null` if no such file. Dies on error.
 */
function readJSON (filepath) {
  if (!fs.existsSync(filepath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(filepath))
  } catch (e) {
    error('Cannot read JSON file', JSON.stringify(filepath))
    errorExit('Detailed error:', e)
  }
}

/**
 * Write data to a JSON file. Writes pretty JSON for
 * human readability over absolute most compactness.
 */
function writeJSON (filepath, data) {
  try {
    var payload = JSON.stringify(data, null, '  ')
    fs.writeFileSync(filepath, payload)
  } catch (e) {
    error('Cannot write JSON file', JSON.stringify(filepath))
    errorExit('Detailed error:', e)
  }
}


/**
 * Given a symbolic dir name starting with
 * `.`, `..`, or `~`, resolve the symbolism,
 * returning an absolute version of the dir.
 */
function resolveSymbolic(filepath) {
  if (filepath[0] === '~') {
    return path.join(process.env.HOME, filepath.slice(1));
  } else if (filepath.slice(0, 2) == '..') {
    var dir = path.resolve(process.cwd(), '..');
    return path.join(dir, filepath.slice(2));
  } else if (filepath[0] == '.') {
    return path.join(process.cwd(), filepath.slice(1));
  }
  return filepath;
}

exports = module.exports = {
  globalize,
  definedOr,
  padRight,
  maxLength,
  longest,
  print,
  println,
  dprintln,
  jsonify,
  error,
  errorExit,
  readJSON,
  writeJSON,
  resolveSymbolic
}
