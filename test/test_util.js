var assert = require('chai').assert
var _      = require('underscore')
var path   = require('path')
var process = require('process')
var fs     = require('fs');
var stdout = require("test-console").stdout;
var stderr = require("test-console").stderr;
var util = require('../util');
util.globalize(util);

describe('util', function() {

  describe('globalize', function(){
    it('should make functions globally available', function(){
      assert.isFunction(definedOr);
      assert.isFunction(padRight);
      assert.isFunction(maxLength);
      assert.isFunction(longest);
    });
  }),

  describe('definedOr', function () {
    it('should return first value, if defined, else default', function () {
      assert.equal(definedOr(1, 3), 1);
      assert.equal(definedOr(undefined, 3), 3);
      assert.equal(definedOr(null, 3), null);
      assert.equal(definedOr('', 3), '');
      assert.equal(definedOr(false, 3), false);
      assert.equal(definedOr(0, 3), 0);
      assert.deepEqual(definedOr([], 3), []);
    });
  });

  describe('padRight', function () {
    it('should add needed spaces, but no more', function () {
      assert.equal(padRight('this', 2), 'this');
      assert.equal(padRight('this', 3), 'this');
      assert.equal(padRight('this', 4), 'this');
      assert.equal(padRight('this', 5), 'this ');
      assert.equal(padRight('this', 6), 'this  ');
      assert.equal(padRight('this', 7), 'this   ');
      assert.equal(padRight('this', 8), 'this    ');
      assert.equal(padRight('this', 9), 'this     ');
      assert.equal(padRight('this', 10), 'this      ');
    }),
    it('should add alt padding chars if desired', function () {
      assert.equal(padRight('this', 2, '*'), 'this');
      assert.equal(padRight('this', 3, '*'), 'this');
      assert.equal(padRight('this', 4, '*'), 'this');
      assert.equal(padRight('this', 5, '*'), 'this*');
      assert.equal(padRight('this', 6, '*'), 'this**');
      assert.equal(padRight('this', 7, '*'), 'this***');
      assert.equal(padRight('this', 8, '*'), 'this****');
      assert.equal(padRight('this', 9, '*'), 'this*****');
      assert.equal(padRight('this', 10, '*'), 'this******');
    });
  });

  describe('maxLength', function () {
    var list = 'and then there was a gigantic event'.split(' '),
        hash = { and: 1, then: 2, there: 3, was: 4, a: 5,
                 gigantic: 6, event: 7};
    it('should work on arrays', function () {
      assert.equal(maxLength(list), 8);
    }),
    it('should work on object keys', function () {
      assert.equal(maxLength(hash), 8);
    }),
    it('should work on empty arrays', function () {
      assert.equal(maxLength([]), 0);
    }),
    it('should work on empty objects', function () {
      assert.equal(maxLength({}), 0);
    });
  })

  describe('longest', function () {
    var list = 'and then there was a gigantic event'.split(' '),
        hash = { and: 1, then: 2, there: 3, was: 4, a: 5,
                 gigantic: 6, event: 7};
    it('should work on arrays', function () {
      assert.equal(longest(list), 'gigantic');
    }),
    it('should work on object keys', function () {
      assert.equal(longest(hash), 'gigantic');
    }),
    it('should work on empty arrays', function () {
      assert.equal(longest([]), null);
    }),
    it('should work on empty objects', function () {
      assert.equal(longest({}), null);
    })
  })

  describe('print', function () {
    it('should print output sans newline', function () {
      var stdo = stdout.inspect();
      print(1, 'this', 'that');
      stdo.restore();
      assert.equal(stdo.output[0], '1 this that');
    });
  })

  describe('println', function () {
    it('should print output plus newline', function () {
      var stdo = stdout.inspect();
      println(1, 'this', 'that');
      stdo.restore();
      assert.equal(stdo.output[0], '1 this that\n');
    });
  })

  describe('error', function () {
    it('should print output plus newline to stderr', function () {
      var stde = stderr.inspect();
      error(1, 'this', 'that');
      stde.restore();
      assert.equal(stde.output[0], '1 this that\n');
    });
  })

  describe('errorExit', function () {
    it('should print output plus newline to stderr, then exit', function (done) {
      var oldExit = process.exit;
      var stde = stderr.inspect();

      // intercept process.exit call
      process.exit = function (num) {
        assert.equal(num, 1);
        stde.restore();
        assert.equal(stde.output[0], '1 this that\n');
        process.exit = oldExit;
        done();
      }

      errorExit(1, 'this', 'that');
    });
  })

  describe('readJSON', function () {
    it('should read JSON contents', function () {
      const d = { a: 1, b: 'two', c: [22, 33] }
      const ds = '{\n  "a": 1,\n  "b": "two",\n  "c": [\n    22,\n    33\n  ]\n}';
      const tdir = fs.mkdtempSync('/tmp/test-');
      const tpath = path.join(tdir, 'in.json')
      fs.writeFileSync(tpath, ds);
      var read_data = readJSON(tpath);
      assert.deepEqual(read_data, d);
      fs.unlinkSync(tpath);
      fs.rmdirSync(tdir);
    })
  })

  describe('writeJSON', function () {
    it('should write JSON contents', function () {
      const d = { a: 1, b: 'two', c: [22, 33] }
      const tdir = fs.mkdtempSync('/tmp/test-');
      const tpath = path.join(tdir, 'out.json')
      writeJSON(tpath, d);
      contents = fs.readFileSync(tpath);
      assert.equal(contents,
        '{\n  "a": 1,\n  "b": "two",\n  "c": [\n    22,\n    33\n  ]\n}');
      fs.unlinkSync(tpath);
      fs.rmdirSync(tdir);
    });
  })

});

// TODO: more of the util module