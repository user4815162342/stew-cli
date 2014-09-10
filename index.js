#!/usr/bin/node
var os = require('os');
var writer = require("./lib/writer");

 
 /**
  * TODO: Some expansion on handling the output of data from the 
  * single-command mode (and possibly interactive mode as well). Instead of
  * just strings and arrays, handle:
  * - Objects: print them out as Property Value definitions. Ignore properties starting
  * with "_" or "$". This will help out quite a bit. If we can get all
  * members, not just "own" properties, that might be even better, because
  * I can use it to list commands. A separate command would output using
  * the standard output in the REPL.
  * - Arrays: Do as now, except: If the Array has a 'columns' member,
  * this will be a list of column definitions, including caption, property name and width (in characters).
  * As well as columns which are subrows (must appear as their own row). The content
  * is expected to match up with properties, only properties specified will be used.
  * - Dates: Print them out according to the user's locale.
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
