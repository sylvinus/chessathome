// Priority order is defaults | config.json | process.env

var defaults = {
  "MONGO":"mongodb://localhost:27017/chessathome_test",
  "AI_ENGINE":"local",
  "PORT":"3000",
  "PORT_GRID":"8000"
};


var config = defaults;

var fs = require('fs');
var path = require('path');
var _ = require("underscore")._;

try {
  var json = JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../config.json"),"utf-8").replace("\n",""));
} catch (e) {
  var json = {};
}

_.each(defaults,function(value,key) {
  if (typeof json[key]!="undefined") config[key] = json[key];
  if (typeof process.env["CHESSATHOME_"+key]!="undefined") config[key] = process.env["CHESSATHOME_"+key];
});

exports.config = config;