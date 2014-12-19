var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,refDoc,title,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        manager.requireRelativeDoc(refDoc).nodeify(function(err,refDoc) {
            if (err) {
                return cb(err);
            }
            if (typeof refDoc === "undefined") {
                return cb(new engine.CommandError("Invalid reference document."));
            }
            return doc.properties(function(err,props) {
                if (err) {
                    return cb(err);
                }
                try {
                    if (typeof props.references === "function") {
                        props.addReferenceTo(refDoc,title);
                        return props.save(cb);
                    } 
                } catch (e) {
                    return cb(e);
                }
                return cb(new engine.CommandError("Please specify a document."));
            });
        });
    });

},function(doc,refDoc,title) {
    if (arguments.length === 1) {
        refDoc = doc;
        doc = void 0;
    } 
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.properties === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        if ((typeof refDoc === "undefined") || 
             ((typeof refDoc === "object") && (typeof refDoc.path === "function")) ||
             (typeof refDoc === "string") ||
             (refDoc instanceof RegExp) ||
             (refDoc instanceof manager.Glob)) {
            if ((typeof title === "undefined") || (typeof title === "string")) {
                return [doc,refDoc,title];
            } else {
                throw new engine.CommandError("Invalid title argument.");
            }
        } else {
            throw new engine.CommandError("Invalid reference document.");
        }
    }
    throw new engine.CommandError("Invalid document argument.");
});
