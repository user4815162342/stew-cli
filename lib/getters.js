var engine = require("./engine");
var SEParser = require("./simpleExpressionParser");
var util = require("util");

// TODO: Need to be able to get references.

var category = module.exports.category = function() {
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Category",props.category());
        });
    }
}

var status = module.exports.status = function() {
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Status",props.status());
        });
    }
}

var tags = module.exports.tags = function() {
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Tags",props.tags());
        });
    }
}

var publish = module.exports.publish = function() {
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Publish",props.publish());
        });
    }
}

var tag = module.exports.tag = function(tag) {
    tags = Array.prototype.slice.call(arguments,0);
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Tag:" + tags.join(","),!!tags.every(props.hasTag.bind(props)));
        });
    }
}

var property = module.exports.property = function(name) {
    return function(doc,cb) {
        return doc.properties(function(err,props) {
            if (err) {
                return cb(err);
            }
            return cb(null,name,props.user().get(name));
        });
    }
}

var synopsis = module.exports.synopsis = function() {
    return function(doc,cb) {
        return doc.readSynopsis(function(err,synopsis) {
            if (err) {
                return cb(err);
            }
            return cb(null,"Synopsis",synopsis);
        });
    }
}

var SelectorParser = module.exports._Parser = function(text) {
    SEParser.call(this,text);
}
util.inherits(SelectorParser,SEParser);

SelectorParser.prototype.default = function(word) {
    this.error("Unknown command")
}

SelectorParser.prototype.identifiers = {
    "category": function() {
        return this.annotate(category(),{ fn: "category" });
    },
    "status": function() {
        return this.annotate(status(), { fn: "status" });
    },
    "tags": function() {
        return this.annotate(tags(), { fn: "tags" })
    },
    "tag": function() {
        this.expectOpenParentheses();
        var tags = [];
        tags.push(this.expectStringArgument());
        while (this.matchComma()) {
            tags.push(this.expectStringArgument());
        }
        this.expectCloseParentheses();
        return this.annotate(tag.apply(null,tags), { fn: "tag", tags: tags });
    },
    "publish": function() {
        return this.annotate(publish(), { fn: "publish" });
    },
    "property": function() {
        this.expectOpenParentheses();
        var prop = this.expectStringArgument();
        this.expectCloseParentheses();
        return this.annotate(property(prop), { fn: "property", name: prop })
    },
    "synopsis": function() {
        return this.annotate(synopsis(), { fn: "synopsis" })
    }
    
}

var parse = module.exports.parse = function(text) {
    // A little more complex than filters in what's allowed.
    if (typeof text === "function") {
        return text;
    }
    if (text instanceof Array) {
        return text.map(function(item) {
            if (typeof item === "function") {
                return item;
            } else {
                return (new SelectorParser(item).parse());
            }
        });
    }
    if (typeof text === "string") {
        var result = [];
        // allow a blank string.
        if (text === "") {
            return result;
        }
        var parser = new SelectorParser(text);
        result.push(parser.expectCommand());
        while (parser.matchComma()) {
            result.push(parser.expectCommand());
        }
        return result;
    }
    throw new engine.CommandError("Invalid value for selector: " + text);
    
}


// For testing...
if (module.parent === null) {
    
    try {
        var selectors  = parse(process.argv[2] || "");
        selectors.forEach(function(selector) {
            console.log(JSON.stringify(SEParser.denotate(selector),null,"  "));
        })
    } catch (e) {
        if (e instanceof engine.CommandError) {
            console.error(e.message);
        } else {
            console.error(e.stack);
        }
    }
}
