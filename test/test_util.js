var assert = require('chai').assert,
    _      = require('underscore');

var util = require('../util');
util.globalize(util);

describe('util', function() {
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
  });

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
    });
  });
});

// TODO: more of the util module
