var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.asyncCommand(function(doc,name,value,cb) {
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
            try {
                switch (true) {
                    case !!((name === "status") && (props.status)):
                        props.status(value);
                        break;
                    case !!((name === "category") && (props.category)):
                        props.category(value);
                        break;
                    case !!((name === "publish") && (props.publish)):
                        props.publish(value);
                        break;
                    default:
                        props.user().set(name,value);
                }
                props.save(cb);
            } catch (e) {
                return cb(e);
            }
        });
    });

},function(doc,prop,value) {
    if (arguments.length === 1) {
        prop = doc;
        doc = void 0;
    } else if (arguments.length === 2) {
        value = prop;
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
        return [doc,prop,value];
    }
    throw new engine.CommandError("Invalid document argument.");
});


