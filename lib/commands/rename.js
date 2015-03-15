var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,name) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return doc.rename(name);        
    });
},function(doc,name) {
    if (arguments.length == 1) {
        name = doc;
        doc = void 0;
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        if (typeof name !== "string") {
            throw new engine.CommandError("Invalid name for document.");
        }
        return [doc,name];
    }
    throw new engine.CommandError("Invalid argument for rename.");
});

