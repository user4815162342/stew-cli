var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,refDoc,title) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return manager.requireRelativeDoc(refDoc).then(function(refDoc) {
            if (typeof refDoc === "undefined") {
                throw new engine.CommandError("Invalid reference document.");
            }
            return doc.properties().then(function(props) {
                if (typeof props.references === "function") {
                    props.addReferenceTo(refDoc,title);
                    return props.save();
                } 
                throw new engine.CommandError("Please specify a document.");
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
         (typeof doc === "string")) {
        if ((typeof refDoc === "undefined") || 
             ((typeof refDoc === "object") && (typeof refDoc.path === "function")) ||
             (typeof refDoc === "string")) {
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
