var path = require("path");

var ellipsis = "\u2026"

var shortenText = function(text,limit) {
    if (text.length > limit) {
        var halve = Math.floor(limit / 2);
        if (halve === 0) {
            return ellipsis;
        } else {
            return text.slice(0,halve - 1) + ellipsis + text.slice(-halve);
        }
    }
    return text;
}


var shorten = module.exports = function(text,limit) {
    if (text.length > limit) {
        // we need to reduce the size.
        if (text.indexOf(path.sep,text.length - 1) === (text.length - 1)) {
            // we can just eat that last path separator.
            return shorten(text.slice(0,-1),limit);
        } 
        // try to preserve the base if possible.
        var base = path.basename(text);
        if (base.length < (limit - 1)) {
            // the -1 saves room for an ellipsis.
            return path.join(shortenText(path.dirname(text),(limit - base.length)),base);;
        } 
        // nothing we can do but trim the base name.
        if (base === text) {
            // there is no directory anyway...
            return shortenText(base,limit);
        } else {
            // there is a directory, we must represent it...
            return shortenText(ellipsis + path.sep + base,limit - 1);
        }
    }
    return text;
            

}
