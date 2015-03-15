var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,tag) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return doc.properties().then(function(props) {
            if (typeof props.tags === "function") {
                props.removeTag(tag);
                return props.save();
            } 
            throw new engine.CommandError("Please specify a document.");
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
         (typeof doc === "string")) {
        return [doc,tag];
    }
    throw new engine.CommandError("Invalid document argument.");
});


