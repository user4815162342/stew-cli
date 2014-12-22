var engine = require("../engine");
var manager = require("../manager");

// TODO: This should be part of 'set', see nextstatus.js

module.exports = engine.promiseCommand(function(doc,cb) {
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return engine.callbackToPromise(doc.properties,doc)().then(function(props) {
            if (props.decStatus) {
                props.decStatus();
                return engine.callbackToPromise(props.save,props)().then(function() {
                    return props.status();
                });
            } else {
                throw new engine.CommandError("Please specify a document.");
            }
        });
    });

},function(doc) {
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        return [doc];
    }
    throw new engine.CommandError("Invalid document argument.");
});


