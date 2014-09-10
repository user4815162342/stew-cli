/**
 * A simplified colors module making use of stuff that's already in util.inspect.
 * */
var util = require("util");


/**
 * Returns a string wrapped in codes which change the color or style
 * of the text. The following styles are available:
 * "bold","italic","underline","inverse","white","grey","black","blue",
 * "cyan","green","magenta","red","yellow"
 * */
var style = module.exports = function(text,style) {
    if (style && util.inspect.colors.hasOwnProperty(style)) {
        return '\u001b[' + util.inspect.colors[style][0] + 'm' + text + '\u001b[' + util.inspect.colors[style][1] + 'm';
    } else {
        return text;
    }
}

var match = /\u001b\[\d*m/g
style.clear = function(text) {
    return text.replace(match,"");
}

// for testing....
if (module.parent === null) {
    var styled = style(process.argv[2],process.argv[3]);
    console.log('"' + styled + '"');
    console.log('"' + style.clear(styled) + '"');
}
