#!/usr/bin/node
var os = require('os');
var writer = require("./lib/writer");

 
 /**
  * TODO: Now that I've got selectors, updators are useful too, for mass
  * update of fields using lsdoc (or perhaps a separate, similar command, like `update`)
  * 
  * TODO: Another useful tool: 
  * stew recent [number | string]: 
  * - basically, whenever a project is opened in interactive stew, it is
  * recorded as recently opened in the global settings file. The recent command would list
  * these files (it should also be able to clear them). If passed a parameter, 
  * it will open the repl with either the project file found at that index, or 
  * would open the repl with the project whose basename is the specified string. 
  * (If mru is used within the repl already, it will just list the files or 
  * open the project, obviously)
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
         console.log(writer(data));
     }
 }
 
 /**
  * These are commands which work only from the command line.
  * */
 nonREPLCommands = {
     // open and init are overridden to behave differently, so they
     // can run the repl.
     "open": function(project,private) {
        var options = {};
        if (project) {
            options.project = project;
        }
        if (typeof dontSearch !== "undefined") {
            options.dontSearch = engine.toBoolean(private);
        }
        if (typeof private !== "undefined") {
            options.private = engine.toBoolean(private);
        }
        require('./lib/repl').main(options);
    },
    "init": function(project,private) {
        var options = {
            createProject: true
        };
        if (project) {
            options.project = project;
        } else {
            options.project = ".";
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
         run(["open"]);
    }
 }
