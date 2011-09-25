(function() {
  var host = window.location.host || "chessathome.org";
  var workDiv = document.getElementById('chessathome-worker');
  if (workDiv) workDiv.innerHTML = '<iframe height="26px" width="120px" frameborder="0" scrolling="no" allowtransparency="true" src="http://'+host+'/iframe"></iframe>';
})();
