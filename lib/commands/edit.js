var engine = require("../engine");
var manager = require("../manager");

/**
 * TODO: The Too many options error should probably lead to a message indicating
 * which extensions are available.
 * */

module.exports = engine.asyncCommand(function(doc,ext,cb) {
    manager.requireRelativeDoc(doc,function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        if (doc.ensurePrimary) {
            return doc.ensurePrimary(ext,function(err,path) {
                if (err) {
                    if (err.code) {
                        switch (err.code) {
                            case "CAN'T ENSURE PRIMARY":
                                return cb(new engine.CommandError("Please specify a file extension."));
                            case "TOO MANY PRIMARIES":
                                return cb(new engine.CommandError("Too many options. Please specify a file extension."));
                        }
                    }
                    return cb(err);
                }
                manager.edit(path,cb);
            });
        }
        return cb(new engine.CommandError("Please specify a document to edit."));
    });

},function(doc,ext) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if ((arguments.length > 1) && (typeof ext !== "string")) {
            throw new engine.CommandError("Invalid extension argument for edit.");
        }
        return [doc,ext];
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});


