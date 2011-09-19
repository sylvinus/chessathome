
var startWorker = function(master, id, engine_path, socketio, Worker,verbose) {
  
  var w = new Worker(engine_path);

  var socket = socketio.connect("http://"+master.host+":"+master.port+"/io/worker");

  //TODO restart each X minutes

  socket.on('connect', function () {
  
    socket.on('ready',function() {
      socketReady = true;
      clientReady();
    });
  
    socket.on("compute",function(fen, timeout) {
      console.log('[' + id + '] Work on ' + fen+' for '+timeout+'ms');
      if (verbose) console.warn("<=",fen,timeout);
      w.postMessage({type: 'position', data: fen});
      w.postMessage({type: 'search', data: timeout});
    });
  
    socket.on('error',function(message) {
      console.error('[' + id + '] Error from remote', message);
    });
  
    socket.emit("init",{id:id});

  });

  socket.on('disconnect',function() {
    //w.terminate() ?
  });


  w.onmessage = function(e) {
    if (verbose) console.warn('[' + id + '] =>',e);
    socket.emit('processResult', e.data);
  };

  w.error = function (e) {
    throw new('Error from worker', e.message);
  }
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports.startWorker = startWorker;
}