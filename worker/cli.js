var ENGINE_PATH = '../build/engine.js'
  , socketio = require('socket.io-client')
  , path = require('path')
  , Worker = require('webworker').Worker;

var CLI_PROCESSES = 4;

var VERBOSE = false;

if (require.main === module) {
  for (var i=0;i<CLI_PROCESSES;i++) {
    exports.start({host: process.ARGV[2] || 'chessathome.org', port: process.ARGV[3] || 80}, 'cli-' + i,path.resolve(__dirname, ENGINE_PATH), socketio, Worker, true);
  }
}
//TODO stop ?