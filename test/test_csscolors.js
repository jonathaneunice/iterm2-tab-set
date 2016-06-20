var assert = require('chai').assert,
    _      = require('underscore');

var cssColorMap = require('../csscolors');

function sum(list) {
  return list.reduce(function (x,y) { return  x+y}, 0);
}

function xor(list) {
  return list.reduce(function (x,y) { return  x^y}, 0);
}

describe('cssColorMap', function() {
  var cmap = cssColorMap();
  describe('point test: aliceblue', function () {
    it('should return known rgb values for aliceblue', function () {
      assert.deepEqual(cmap['aliceblue'], [240,248,255]);
    });
  });
  describe('point test: gold', function () {
    it('should return known rgb values for gold', function () {
      assert.deepEqual(cmap['gold'], [255,215,0]);
    });
  });
  describe('correct size', function () {
    it('should have 148 colors', function () {
      assert.equal(Object.keys(cmap).length, 148);
    });
  });

  describe('checksum add', function () {
    it('should have correct sum', function () {
      var columns = [
        sum(_.pluck(cmap, 0)),
        sum(_.pluck(cmap, 1)),
        sum(_.pluck(cmap, 2))
      ];
      assert.deepEqual(columns, [24016, 23160, 22464]);
    });
  });

  describe('checksum xor', function () {
    it('should have correct xor values', function () {
      var columns = [
        xor(_.pluck(cmap, 0)),
        xor(_.pluck(cmap, 1)),
        xor(_.pluck(cmap, 2))
      ];
      assert.deepEqual(columns, [78, 234, 124]);
    });
  });
});
