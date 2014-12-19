Debugging the repl is difficult to do with "node debug", since the
debug repl conflicts with the internal repl, and you can't easily pass 
data into the stdin.

(Or you could just node debug the single command version, but that might
not give you what you need.)

Instead, install node-inspector:

    sudo npm install node-inspector -g
    
Once this is done, run node-inspector in a separate terminal:

    node-inspector & 
    
Then, run the app with "--debug" instead of "debug". This puts the application
into remote debugging mode.

    node --debug index.js
    
And, once it's running, in that other terminal, open chrome. This
won't work in firefox:
 
    google-chrome "http://127.0.0.1:8080/debug?port=5858"
    
(The URL may be different, look at the output from node-inspector).
    
Whenever you have to restart the debugging, you should be able to refresh
that page. You know it's working if you get the javascript files showing
up in the browser.
    
node-inspector comes with a command node-debug, which does debugging
in normal ways, but this doesn't work in our situation, since it creates
it's own repl as well, and opens up the debugging in the default browser,
which might not be chrome.


