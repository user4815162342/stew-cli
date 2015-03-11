var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,newChild) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return manager.requireRelativeDoc(newChild).then(function(child) {
            if (typeof child === "undefined") {
                throw new engine.CommandError("New child is not in a stew project.");
            }
            return engine.callbackToPromise(doc.moveDocTo,doc)(child);        
        });
    });
},function(doc,newChild) {
    if (arguments.length == 1) {
        newChild = doc;
        doc = void 0;
    }
    
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.moveDocTo === "function")) ||
         (typeof doc === "string")) {
        if (((typeof newChild === "object") && (typeof newChild.ensurePrimary === "function")) ||
             (typeof newChild === "string")) {
            return [doc,newChild];
        }
        throw new engine.CommandError("Invalid document argument for move.");
    }
    throw new engine.CommandError("Invalid directory argument for move.");
});

