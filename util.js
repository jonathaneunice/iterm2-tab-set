
var _       = require('underscore'),
    fs      = require('fs'),
    process = require('process');

/**
 * Given an export object ("module") `e`,
 * promote its keys to the global context.
 * If an optional list of keys is given
 * (in wsv or Array form), promote just those
 * keys.
 */
function globalize(e, just) {
  if (just && (typeof(just) == "string"))
    just = just.split(/\s+/);
  Object.keys(e).forEach(function(k) {
    if (!just || _.contains(just, k))
      GLOBAL[k] = e[k];
  });
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
      : value
}


/**
 * Return the maximum length of a collection of strings.
 * The collection may be an array or an object. If an object,
 * uses the object keys. (To find the max length of the object's
 * values, compute a list of values first.)
 */
function maxLength(o) {
  var strings = _.isArray(o) ? o : _.keys(o);
  if (!_.size(strings)) return 0;
  return _.max(strings.map(s => s.length));

  // equivalent to `longest(o).length`
}


/**
 * Return the longest string in the given object. Like
 * maxLength(), but returns the actual string.
 */
function longest(o) {
  var strings = _.isArray(o) ? o : _.keys(o);
  if (!_.size(strings)) return null;
  return _.max(strings, s => s.length);
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
function padRight(str, width, padding) {
  var len = str.length
  return (width <= len)
    ? str
    : str + Array(width-len+1).join(padding||" ")
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
 * Println to stderr.
 */
function error() {
  var msg = _.toArray(arguments).concat("\n").join(' ');
  process.stderr.write(msg);
}


/**
 * Println to stderr, then quit.
 */
function errorExit() {
  var msg = _.toArray(arguments).concat("\n").join(' ');
  process.stderr.write(msg);
  process.exit(1);
}



/**
 * Read a JSON file. Return the result. Returns
 * `null` if no such file. Dies on error.
 */
function readJSON(filepath) {
  if (!fs.existsSync(filepath))
    return null;
  try {
    return JSON.parse(fs.readFileSync(filepath));
  } catch (e) {
    error("Cannot read JSON file", JSON.stringify(filepath));
    errorExit("Detailed error:", e);
  }
}


/**
 * Write data to a JSON file. Writes pretty JSON for
 * human readability over absolute most compactness.
 */
function writeJSON(filepath, data) {
  try {
    payload = JSON.stringify(data, null, "  ");
    fs.writeFileSync(filepath, payload);
  } catch (e) {
    error("Cannot write JSON file", JSON.stringify(filepath));
    errorExit("Detailed error:", e);
  }
}


exports = module.exports = {
  globalize,
  definedOr,
  padRight,
  maxLength,
  longest,
  print,
  println,
  error,
  errorExit,
  readJSON,
  writeJSON
};