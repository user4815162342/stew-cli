var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,name,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        doc.rename(name,cb);        
    });
},function(doc,name) {
    if (arguments.length == 1) {
        name = doc;
        doc = void 0;
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if (typeof name !== "string") {
            throw new engine.CommandError("Invalid name for document.");
        }
        return [doc,name];
    }
    throw new engine.CommandError("Invalid argument for rename.");
});

