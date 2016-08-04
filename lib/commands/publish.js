var engine = require("../engine");
var manager = require("../manager");


module.exports = engine.promiseCommand(function(doc,outputFile,dryRun,pandocOpts) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        if (doc.publish) {
            return doc.publish(outputFile,function(message,percentComplete) {
                if (percentComplete) {
                    console.log("%d% -- %s",percentComplete,message);
                } else {
                    console.log(message);
                }
            },dryRun,pandocOpts).then(function(outputFile) {
                console.log("Document published successfully to " + outputFile);
                return manager.edit(outputFile);
            });
        } 
        throw new engine.CommandError("This document can not be published for some reason.");
    });

},function(doc,outputFile,dryRun,pandocOpts) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        if ((typeof outputFile === "string") ||
             (typeof outputFile === "undefined")) {
            if (typeof dryRun !== "undefined") {
                dryRun = engine.toBoolean(dryRun);
            } else {
                dryRun = false;
            }
            if (typeof pandocOpts === "string") {
                pandocOpts = [pandocOpts]
            } else if (typeof pandocOpts === "undefined") {
                pandocOpts = []
            } else if (!(pandocOpts instanceof Array) {
                throw new engine.CommandError("Invalid argument for pandoc options")
            }
            return [doc,outputFile,dryRun,pandocOpts];
        } 
        throw new engine.CommandError("Invalid argument for output file");
    }
    throw new engine.CommandError("Invalid document argument for edit.");
});


