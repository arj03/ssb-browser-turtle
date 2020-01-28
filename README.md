# ssb-turtle

SSB-turtle is a way to run multiple
[ssb-browser](https://github.com/arj03/ssb-browser-core) applications
from the same domain. Instead of having a central store for apps, you
load apps from your friends. All data for the apps are fetched as
messages and blobs and stored locally so the apps can run offline.

![Screenshot of ssb turtle][screenshot]

[screenshot]: assets/screenshot.jpg

## Running locally

`npm run build` will compile the javascript. `write-dist.js` can be
used to prepare all the files needed in the dist dir in a
cache-busting friendly manner. To test locally it is recommended to
run a http server from this directory.
