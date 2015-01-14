/**
 * A simplified colors module making use of stuff that's already in util.inspect.
 * */
var ansiStyles = require("ansi-styles");


/**
 * Returns a string wrapped in codes which change the color or style
 * of the text. The following styles are available:
 * "bold","italic","underline","white","grey"/"gray","black","blue",
 * "cyan","green","magenta","red","yellow","bgWhite","bgGrey"/"bgGray", etc.
 * background versions of colors.
 * 
 * "+"... adds the specified content to the end of the text.
 * 
 * */
var style = module.exports = function(text,style) {
    if (style === "grey") {
        style = "gray";
    }
    if (style === "bgGrey") {
        style = "bgGray";
    }
    if (style && ansiStyles.hasOwnProperty(style)) {
        var on = ansiStyles[style].open; 
        var off = ansiStyles[style].close; 
        // wrap every individual line. This will help in formatting
        // cell values in tables.
        return on + text.replace(/\n/g,(off + "\n" + on)) + off;
    } else if (style && (style[0] === "+")) {
        return ansiStyles["bold"].open + style.slice(1) + ansiStyles["bold"].close +  " " + text;
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
