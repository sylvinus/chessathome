/**
 * Module dependencies.
 */

//this is only for joyent.

var express = require('express')
  , app = module.exports = express.createServer();

app.get("/",function(req,res) {
  res.redirect("http://chessathome.org/");
});

var CLI_PROCESSES=4;

for (var i=0;i<CLI_PROCESSES;i++) {
  require("./worker/client.js").start({'host':'joshfire.nko2.nodeknockout.com','port':8000, reconnect: 5000}, 'joyent-' + i);
}

app.listen(process.env.PORT || 3000);