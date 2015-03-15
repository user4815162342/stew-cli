var engine = require("../engine");
var manager = require("../manager");

/**
 * TODO: The Too many options error should probably lead to a message indicating
 * which extensions are available.
 * */

module.exports = engine.promiseCommand(function(doc,ext) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        if (doc.ensurePrimary) {
            return doc.ensurePrimary(ext).then(function(path) {
                return manager.edit(path);
            },function(err) {
                if (err.code) {
                    switch (err.code) {
                        case "CAN'T ENSURE PRIMARY":
                            throw new engine.CommandError("Please specify a file extension.");
                        case "TOO MANY PRIMARIES":
                            throw new engine.CommandError("Too many options. Please specify a file extension.");
                    }
                }
            });
        }
        throw new engine.CommandError("Please specify a document to edit.");
    });

},function(doc,ext) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        if ((arguments.length > 1) && (typeof ext !== "string")) {
            throw new engine.CommandError("Invalid extension argument for edit.");
        }
        return [doc,ext];
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});


