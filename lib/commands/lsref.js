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
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            try {
                if (typeof props.references === "function") {
                    return cb(null,props.references().map(function(ref) {
                        var result = { title: ref.title() }
                        if (ref.url()) {
                            result.url = ref.url();
                        }
                        if (ref.doc()) {
                            result.doc = ref.doc();
                        }
                        // This ensures that it's output correctly in
                        // single-command mode.
                        result.toString = function() {
                            var text = result.title;
                            if (result.doc) {
                                text += ": " + result.doc.path();
                            } else if (result.url) {
                                text += ": " + result.url;
                            }
                            return text;
                        }
                        return result;
                    }));
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
        if ((typeof refDoc === "undefined") || 
             ((typeof refDoc === "object") && (typeof refDoc.path === "function")) ||
             (typeof refDoc === "string") ||
             (refDoc instanceof RegExp) ||
             (refDoc instanceof manager.Glob)) {
            if ((typeof title === "undefined") || (typeof title === "string")) {
                return [doc];
            } else {
                throw new engine.CommandError("Invalid title argument.");
            }
        } else {
            throw new engine.CommandError("Invalid reference document.");
        }
    }
    throw new engine.CommandError("Invalid document argument.");
});
