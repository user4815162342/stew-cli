var engine = require("../engine");
var manager = require("../manager");

module.exports = engine.promiseCommand(function(doc,name,value) {
    name = name.toLowerCase();
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        return doc.properties().then(function(props) {
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
            return props.save();
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
         (typeof doc === "string")) {
        return [doc,prop,value];
    }
    throw new engine.CommandError("Invalid document argument.");
});


