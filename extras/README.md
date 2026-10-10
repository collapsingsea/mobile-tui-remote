# Optional ttyd helper

`ttyd-copy-fix.js` is not needed by the mobile client. It is included because
it is useful when the same tmux session is also exposed through ttyd on a PC.

Inject the script into your custom ttyd index page after ttyd/xterm initializes.
It expects ttyd to expose its xterm instance as `window.term`.
