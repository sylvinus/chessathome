var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");

var epd = require("../_epd.js");

var fs = require('fs');
var path = require('path');

var fn = path.normalize(__dirname +'/../public/positions/epd/wac.epd');

Q.module("EPD tests");

Q.test("arasan",function() {
  Q.expect(1);
  Q.stop();
  epd.runFile(fn,{},{useCache:false},function(err,results) {
    Q.ok(!err);
    console.warn("GOT RESULTS",results);
    Q.start();
  });
});


