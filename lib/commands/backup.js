var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,id,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        if (doc.backupPrimary) {
            return doc.backupPrimary(void 0,id,cb);
        }
        return cb(new engine.CommandError("Please specify a document to backup."));
    });

},function(doc,id) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if ((arguments.length > 1) && (typeof id !== "string")) {
            throw new engine.CommandError("Invalid id argument for backup.");
        }
        return [doc,id];
    }
    throw new engine.CommandError("Invalid document argument for backup.");
});


