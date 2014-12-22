var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,refDoc,cb) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return manager.requireRelativeDoc(refDoc).then(function(refDoc) {
            if (typeof refDoc === "undefined") {
                throw new engine.CommandError("Invalid reference document.");
            }
            return engine.callbackToPromise(doc.properties)().then(function(props) {
                if (typeof props.references === "function") {
                    props.removeReferencesTo(refDoc);
                    return engine.callbackToPromise(props.save,props)();
                } 
                throw new engine.CommandError("Please specify a document.");
            });
        });
    });

},function(doc,refDoc) {
    if (arguments.length === 1) {
        refDoc = doc;
        doc = void 0;
    } 
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.properties === "function")) ||
         (typeof doc === "string")) {
        if ((typeof refDoc === "undefined") || 
             ((typeof refDoc === "object") && (typeof refDoc.path === "function")) ||
             (typeof refDoc === "string")) {
            return [doc,refDoc];
        } else {
            throw new engine.CommandError("Invalid reference document.");
        }
    }
    throw new engine.CommandError("Invalid document argument.");
});
