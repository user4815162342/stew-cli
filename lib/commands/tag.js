var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,tag,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
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
                    props.addTag(tag);
                    return props.save(cb);
                } 
            } catch (e) {
                return cb(e);
            }
            return cb(new engine.CommandError("Please specify a document."));
        });
    });

},function(doc,tag) {
    if (arguments.length === 1) {
        tag = doc;
        doc = void 0;
    } 
    if (typeof tag !== "string") {
        throw new engine.CommandError("Invalid tag name.");
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.properties === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc,tag];
    }
    throw new engine.CommandError("Invalid document argument.");
});


