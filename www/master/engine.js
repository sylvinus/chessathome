exports.loadEngine = function(engine) {
  return require("./engines/"+engine);
}