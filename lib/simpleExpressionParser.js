var engine = require("./engine");
var util = require("util");

var Parser = module.exports = function(text) {
    
    var position = 0;
    
    this.next = function() {
        position += 1;
        return this.char();
    }
    
    this.char = function() {
        return text[position];
    }
    
    this.error = function(msg) {
        var format = "Parse Error: %s '%s'";
        //                                       
        var pointerPrefixLength = (format.length - 5) + msg.length + position;
        msg = util.format(format,msg,text) + "\n" + (new Array(pointerPrefixLength + 1).join(" ") + "^");
        throw new engine.CommandError(msg,"PARSE ERROR");
    }
}

Parser.prototype.annotate = function(fn,props) {
    fn.annotations = props;
    return fn;
}

var denotate = Parser.denotate = function(ast) {
    if ((typeof ast === "function") && (ast.annotations)) {
        return denotate(ast.annotations);
    } else if (ast instanceof Array) {
        var result = [];
        ast.forEach(function(item) {
            result.push(denotate(item));
        });
        return result;
    } else if (typeof ast === "object") {
        var result = {};
        Object.keys(ast).forEach(function(key) {
            result[key] = denotate(ast[key]);
        });
        return result;
    } else {
        return ast;
    }
}

Parser.prototype.operators = /[(),]/;

Parser.prototype.expectOpenParentheses = function() {
    if (this.char() !== "(") {
        this.error("Expected open parenthesis.");
    }
    this.next();
}

Parser.prototype.matchOpenParentheses = function() {
    if (this.char() === "(") {
        this.next();
        return true;
    }
    return false;
}

Parser.prototype.expectCloseParentheses = function() {
    if (this.char() !== ")") {
        this.error("Expected close parenthesis.");
    }
    this.next();
}

Parser.prototype.matchComma = function() {
    if (this.char() === ",") {
        this.next();
        return true;
    }
    return false;
}

Parser.prototype.expectStringArgument = function() {
    var result = "";
    for (var c = this.char(); (typeof c !== "undefined") && (!this.operators.test(c)); c = this.next()) {
        switch (c) {
            case "\\":
                c = this.next();
                if (typeof c === "undefined") {
                    result += "\\";
                } else {
                    result += c;
                }
                break;
            default:
                result += c;
                break;
        }
    }
    return result;
}

Parser.prototype.expectCommand = function() {
    var word = this.expectStringArgument();
    if (this.identifiers.hasOwnProperty(word)) {
        return this.identifiers[word].bind(this)();
    } else if (word !== "") {
        return this.default(word)
    } else {
        this.error("Expected command.");
    }
}

Parser.prototype.parse = function() {
    var command = this.expectCommand();
    if (typeof this.char() !== "undefined") {
        this.error("Unexpected content after command");
    }
    return command;
}

// abstracts...
Parser.prototype.default = function(word) {
    throw new Error("Abstract method called.");
}

Parser.prototype.identifiers = {
}
