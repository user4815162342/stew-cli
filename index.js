#!/usr/bin/node
var os = require('os');

 
 /**
  * TODO: I need to be able to open up different projects in different
  *  cli nstances at once.
  * Also need to be able to specify whether or where it saves state.
  * -- Create a command which only works in single-mode to start up the repl optionally:
  *    stew repl [project] [private]
  *    * The project specifies a directory to open for repl, 
  *    this will cause the global settings to be set to this as the
  *    last opened project (NOTE: This is not a problem, see below)
  *    * Private is a boolean, if true this will not set modify any global 
  *    settings at all.
  * 
  * 
  * TODO: Finish implementing the unimplemented commands.
  * */
 var engine = require("./lib/engine");
 
 var outputError = function(err) {
     if (err instanceof engine.CommandError) {
         console.error(err.message);
     } else {
         console.error(err);
         if (err.stack) {
             console.error(err.stack);
         }
     }
 }
 
 var outputResult = function(data) {
     if (typeof data !== "undefined") {
         if (data.join) {
             // string arrays can be joined into lines to aid with formatting.
             console.log(data.join(os.EOL));
         } else {
             console.log(data.toString());
         }
     }
 }
 
 var run = module.exports.run = function(args) {
     try {
         var command = engine.loadCommand(args[0]);
         var result = command.apply(null,args.slice(1));
         if (result instanceof engine.AsynchronousCall) {
             result.run(function(err,data) {
                 if (err) {
                     outputError(err);
                 } else {
                     outputResult(data);
                 }
             });
         } else {
             outputResult(result);
         }
     } catch (e) {
         outputError(e);
     }
 }
 
 
 if (!module.parent) {
     if ((process.argv.length > 2) && (process.argv[2] !== "repl")) {
         run(process.argv.slice(2));
     } else {
         var options = {};
        if (process.argv[3]) {
            options.project = process.argv[3];
        }
        if (process.argv[4]) {
            options.private = engine.toBoolean(process.argv[4]);
        }
        require('./lib/repl').main(options);
    }
 }
