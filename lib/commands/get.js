var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,name,cb) {
    name = name.toLowerCase();
    manager.requireRelativeDoc(doc,function(err,doc) {
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
            switch (true) {
                case !!((name === "status") && (props.status)):
                    return cb(null,props.status());
                case !!((name === "category") && (props.category)):
                    return cb(null,props.category());
                case !!((name === "publish") && (props.publish)):
                    return cb(null,props.publish());
                default:
                    return cb(null,props.user().get(name));
            }
        });
    });

},function(doc,prop) {
    if (arguments.length == 1) {
        prop = doc;
        doc = void 0;
    }
    if (typeof prop !== "string") {
        throw new engine.CommandError("Invalid property name.");
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc,prop];
    }
    throw new engine.CommandError("Invalid document argument.");
});


