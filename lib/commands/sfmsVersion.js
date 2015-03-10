module.exports = function() {
    // I don't have access to sfms directly, since it's only *required* by core,
    // so...
    var core = require("stew-core");
    var coreModule = require.cache[require.resolve("stew-core")];
    var package = coreModule.require("SFMS/package.json");
    return package.version;
}


