var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        if (doc.ensureSynopsis) {
            return engine.callbackToPromise(doc.ensureSynopsis,doc)().then(function(path) {
                return manager.edit(path);
            },function(err) {
                if (err.code) {
                    switch (err.code) {
                        case "TOO MANY SYNOPSES":
                            throw new engine.CommandError("Too many options. Please specify a file extension.");
                    }
                }
            });
        }
        return cb(new engine.CommandError("Please specify a document to edit."));
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        return [doc];
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});


