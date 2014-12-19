var engine = require("../engine");
var manager = require("../manager");
var getters = require("../getters");

var applySelectors = function(doc,result,selectors,cb) {
    if (selectors.length) {
        selectors.shift()(doc,function(err,field,value) {
            if (err) {
                return cb(err);
            }
            result[field] = value;
            applySelectors(doc,result,selectors,cb);
        });
    } else {
        return cb();
    }
}

module.exports = engine.asyncCommand(function(doc,selectors,cb) {
    manager.requireRelativeDoc(doc).nodeify(function(err,doc) {
        if (err) {
            return cb(err);
        }
        if (typeof doc === "undefined") {
            return cb(new engine.CommandError("Not in a stew project."));
        }
        var result = {};
        applySelectors(doc,result,selectors,function(err) {
            if (err) {
                return cb(err);
            }
            return cb(null,result);
        });
    });

},function(doc,selectors) {
    if (arguments.length == 1) {
        selectors = doc;
        doc = void 0;
    }
    if (typeof selectors !== "undefined") {
        selectors = getters.parse(selectors);
        if (!(selectors instanceof Array)) {
            selectors = [selectors];
        }
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string") ||
         (doc instanceof RegExp) ||
         (doc instanceof manager.Glob)) {
        return [doc,selectors];
    }
    throw new engine.CommandError("Invalid document argument.");
});


