var engine = require("./engine");
var SEParser = require("./simpleExpressionParser");
var util = require("util");

// TODO: Need to be able to get references and backup names.

var fieldResult = function(field,value) {
    return {
        field: field,
        value: value
    }
}

var category = module.exports.category = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            return {
                field: "Category",
                value: props.category()
            }
        });
    }
}

var status = module.exports.status = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult("Status",props.status());
        });
    }
}

var tags = module.exports.tags = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult("Tags",props.tags());
        });
    }
}

var publish = module.exports.publish = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult("Publish",props.publish());
        });
    }
}

var title = module.exports.title = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult("Title",props.title());
        });
    }
}

var tag = module.exports.tag = function(tag) {
    tags = Array.prototype.slice.call(arguments,0);
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult("Tag:" + tags.join(","),!!tags.every(props.hasTag.bind(props)));
        });
    }
}

var property = module.exports.property = function(name) {
    return function(doc) {
        return doc.properties().then(function(props) {
            return fieldResult(name,props.user().get(name));
        });
    }
}

var synopsis = module.exports.synopsis = function() {
    return function(doc) {
        return doc.readSynopsis().then(function(synopsis) {
            return fieldResult("Synopsis",synopsis);
        });
    }
}

var user = module.exports.user = function() {
    return function(doc) {
        return doc.properties().then(function(props) {
            var list = Object.keys(props.user()._data);
            var result = {};
            if (list.length) {
                list.forEach(function(key) {
                    result[key] = props.user().get(key);
                });
            } else {
                result = "<none>";
            }
            return fieldResult("User Properties",result);
        });
    }
}


var SelectorParser = module.exports._Parser = function(text) {
    SEParser.call(this,text);
}
util.inherits(SelectorParser,SEParser);

SelectorParser.prototype.default = function(word) {
    //this.error("Unknown command")
    return this.annotate(property(word), { fn: "property", name: word })
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
    "title": function() {
        return this.annotate(title(), { fn: "title" });
    },
    "property": function() {
        this.expectOpenParentheses();
        var prop = this.expectStringArgument();
        this.expectCloseParentheses();
        return this.annotate(property(prop), { fn: "property", name: prop })
    },
    "synopsis": function() {
        return this.annotate(synopsis(), { fn: "synopsis" })
    },
    "user": function() {
        return this.annotate(user(), { fn: "user" });
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
