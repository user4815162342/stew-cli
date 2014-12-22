var engine = require("../engine");
var manager = require("../manager");
var getters = require("../getters");

var applySelectors = function(doc,result,selectors,cb) {
    if (selectors.length) {
        return selectors.shift()(doc).then(function(fv) {
            result[fv.field] = fv.value;
            return applySelectors(doc,result,selectors);
        });
    } else {
        return engine.resolvedPromise(result);
    }
}

module.exports = engine.promiseCommand(function(doc,selectors) {
    debugger;
    return manager.requireRelativeDoc(doc).then(function(doc) {
        if (typeof doc === "undefined") {
            throw new engine.CommandError("Not in a stew project.");
        }
        var result = {};
        return applySelectors(doc,result,selectors);
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
    } else {
        selectors = [];
    }
    if ((typeof doc === "undefined") || 
         ((typeof doc === "object") && (typeof doc.ensurePrimary === "function")) ||
         (typeof doc === "string")) {
        return [doc,selectors];
    }
    throw new engine.CommandError("Invalid document argument.");
});


