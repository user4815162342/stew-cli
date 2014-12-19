var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        if (doc.ensureSynopsis) {
            return doc.ensureSynopsis(function(err,path) {
                if (err) {
                    if (err.code) {
                        switch (err.code) {
                            case "TOO MANY SYNOPSES":
                                return cb(new engine.CommandError("Too many options. Please specify a file extension."));
                        }
                    }
                    return cb(err);
                }
                manager.edit(path).nodeify(cb);
            });
        }
        return cb(new engine.CommandError("Please specify a document to edit."));
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc];
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});


