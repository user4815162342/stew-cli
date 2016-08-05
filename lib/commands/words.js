var engine = require("../engine");
var manager = require("../manager");
var formatting = require("../formatting");

module.exports = engine.promiseCommand(function(doc,dryRun) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        if (doc.countWords) {
            return doc.countWords(function(message,percentComplete) {
                if (percentComplete) {
                    console.log("%d% -- %s",percentComplete,message);
                } else {
                    console.log(message);
                }
            },dryRun).then(function(count) {
                return new formatting.Style({ "text-style": ["bold"] },{ "Total Words": count });
                
            });
        } 
        throw new engine.CommandError("This document can not be counted for some reason.");
    });

},function(doc,dryRun) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        if (typeof dryRun !== "undefined") {
            dryRun = engine.toBoolean(dryRun);
        } else {
            dryRun = false;
        }
        return [doc,dryRun];
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});



