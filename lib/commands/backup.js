var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,id,cb) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        if (doc.backupPrimary) {
            return doc.backupPrimary(void 0,id);
        }
        throw new engine.CommandError("Please specify a document to backup.");
    });

},function(doc,id) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        if ((arguments.length > 1) && (typeof id !== "string")) {
            throw new engine.CommandError("Invalid id argument for backup.");
        }
        return [doc,id];
    }
    throw new engine.CommandError("Invalid document argument for backup.");
});


