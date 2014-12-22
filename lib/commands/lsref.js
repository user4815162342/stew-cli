var engine = require("../engine");
var manager = require("../manager");

// TODO: This command isn't registered. Did I rename it and forget to delete the old? 
// In any case, this should probably be a 'getter'.

module.exports = engine.promiseCommand(function(doc) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return engine.callbackToPromise(doc.properties,doc)().then(function(props) {
            if (typeof props.references === "function") {
                return props.references().map(function(ref) {
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
                });
            } 
            throw new engine.CommandError("Please specify a document.");
        });
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.properties === "function")) ||
         (typeof doc === "string")) {
        if ((typeof refDoc === "undefined") || 
             ((typeof refDoc === "object") && (typeof refDoc.path === "function")) ||
             (typeof refDoc === "string")) {
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
