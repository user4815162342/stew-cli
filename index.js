#!/usr/bin/node
var os = require('os');

 
 /**
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
 
 /**
  * These are commands which work only from the command line.
  * */
 nonREPLCommands = {
     "repl": function(project,private) {
        var options = {};
        if (project) {
            options.project = project;
        }
        if (typeof private !== "undefined") {
            options.private = engine.toBoolean(private);
        }
        require('./lib/repl').main(options);
    }
     
 }
 
 var run = module.exports.run = function(args) {
     try {
         if (nonREPLCommands.hasOwnProperty(args[0])) {
             nonREPLCommands[args[0]].apply(nonREPLCommands,args.slice(1));
         } else {
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
         }
     } catch (e) {
         outputError(e);
     }
 }
 
 
 if (!module.parent) {
     if (process.argv.length > 2) {
         run(process.argv.slice(2));
     } else {
         run(["repl"]);
    }
 }
