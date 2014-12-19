var engine = require("../engine");
var manager = require("../manager");

// TODO: This should be part of 'set', see nextstatus.js

module.exports = engine.asyncCommand(function(doc,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            if (props.decStatus) {
                props.decStatus();
                props.save(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null,props.status());
                });
            } else {
                return cb(new engine.CommandError("Please specify a document."));
            }
        });
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc];
    }
    throw new engine.CommandError("Invalid document argument.");
});


