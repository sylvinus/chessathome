
var startWorker = function(master, id, engine_path, socketio, Worker,verbose) {
  
  var w = new Worker(engine_path);

  var url = "";
  if (master.host) {
    url = "http://"+master.host+":"+master.port;
  }
  var socket = socketio.connect(url+"/io/worker",{'force new connection':true});

  //TODO restart each X minutes

  var lastSecret = false;
  var lastFen = false;
  
  socket.on('connect', function () {
  
    if (verbose) console.warn('[' + id + '] Connected.');
    
    socket.on('ready',function(x) {
      socketReady = true;
      if (verbose) console.warn('[' + id + '] Ready.',x);
    });
  
    socket.on("compute",function(work) {
      if (verbose) console.warn('[' + id + '] Work on ' + work.fen+' for '+work.timeout+'ms');
      lastSecret = work.secret;
      lastFen = work.fen;
      w.postMessage({type: 'position', data: work.fen});
      w.postMessage({type: 'search', data: work.timeout});
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
    e.data.workFen = lastFen;
    e.data.secret = lastSecret;
    socket.emit('processResult', e.data);
  };

  w.error = function (e) {
    console.error('Error from worker', e.message);
  }
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports.startWorker = startWorker;
}