var Q = require('../public/qunit/cli.js').QUnit;

require("../_engineboot.js");

var uuid = require('node-uuid');

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

Q.module('Worker tests');

Q.test('work test', function() {
  
});