var ENGINE_PATH = '../build/engine.js'
  , dnode = require('dnode')
  , EventEmitter = require('events').EventEmitter
  , path = require('path')
  , Worker = require('webworker').Worker;

var CLI_PROCESSES = 4;

var VERBOSE = false;

exports.start = function(master, id) {
  
  var emitter = new EventEmitter;
  var w = new Worker(path.resolve(__dirname, ENGINE_PATH));
  
  var client = dnode(function() {
    var self = this;
    
    self.role = 'worker';

    w.onmessage = function(e) {
      if (VERBOSE) console.warn("=>",e);
      emitter.emit('result', e.data);
    };

    w.error = function (e) {
      throw new('Error from worker', e.message);
    }

    self.name = 'Worker '+id;

    this.compute = function (fen, timeout) {
      console.log('[' + self.name + '] Work on ' + fen+' for '+timeout+'ms');
      if (VERBOSE) console.warn("<=",fen,timeout);
      w.postMessage({type: 'position', data: fen});
      w.postMessage({type: 'search', data: timeout});
    };

    this.terminate = function() {
      emitter.emit('terminate');
    };
  });
  
  console.log('Trying to connect with', master);
  client.connect(master, function(remote, conn) {

    // Waiting confirmation from SubStack
    // function reconnect() {
    //   console.log('Calling reconnect()');
    //   conn.reconnect(1000, function (err) {
    //     if (err) {
    //       console.error(err);
    //       reconnect();
    //     } else {
    //       console.warn('loopsiloppsiloo');
    //     }
    //   });
    // }

    conn.on('ready', function () {
      console.log('Connected, waiting for jobs');
    });

    conn.on('timeout', function () {
      console.log('Timeout with the server.');
      // reconnect();
    });

    conn.on('end', function () {
      console.log('Server probably crashed.');
      // reconnect();
    });

    emitter.on('result', function(data) {
      remote.processResult(data);
    });

    emitter.on('terminate', function() {
      console.log('Force terminate of client');
      conn.end();
    });
  });

}

if (require.main === module) {
  for (var i=0;i<CLI_PROCESSES;i++) {
    exports.start({host: process.ARGV[2] || 'joshfire.nko2.nodeknockout.com', port: process.ARGV[3] || 8000, reconnect: 5000}, 'cli-' + i);
  }
}
//TODO stop ?