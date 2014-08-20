var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            try {
                if (typeof props.tags === "function") {
                    return cb(null,props.tags());
                } 
            } catch (e) {
                return cb(e);
            }
            return cb(new engine.CommandError("Please specify a document."));
        });
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.properties === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc];
    }
    throw new engine.CommandError("Invalid document argument.");
});


