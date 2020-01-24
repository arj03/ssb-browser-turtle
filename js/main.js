(function() {
  const path = require('path')
  const raf = require('polyraf')
  const pull = require('pull-stream')

  if (location.protocol === 'https:' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js');
    })
  }

  function httpGet(url, responseType, cb) {
    var req = new XMLHttpRequest()
    req.timeout = 2000;
    req.onreadystatechange = function() {
      if (req.readyState == 4 && req.status == 200)
        cb(null, req.response)
    }
    req.onerror = function() {
      cb("Error requesting blob")
    }
    req.ontimeout = function () {
      cb("Timeout requesting blob")
    }

    req.open("GET", url, true)
    if (responseType)
      req.responseType = responseType

    req.send()
  }

  SSB.events.on('SSB: loaded', function() {
    new Vue({
      el: "#app",
      data: function() {
        return {
          appId: "%tf+DpegXvexYmuXzB+D7AS+50UcXPjJPgZXNiw8S7jM=.sha256|@Oh2NQslutj+XQRJkkfzKr6gw5mt49mdYY43Rs33y3yY=.ed25519"
        }
      },
      methods: {
        getapp: function() {
          var self = this
          if (this.appId != '' && this.appId.startsWith('%')) {
            SSB.remoteAddress = 'ws:localhost:8989~shs:Oh2NQslutj+XQRJkkfzKr6gw5mt49mdYY43Rs33y3yY=.ed25519' // FIXME
            SSB.connected((rpc) => {
              let author, appRootId
              [appRootId, author] = this.appId.split('|')
              rpc.getThread.get(appRootId, (err, messages) => {
                if (err) return alert("Unable to download application message")

                const message = messages.filter(x => x.author == author).pop()
                console.log(message)

                SSB.state = SSB.validate.appendOOO(SSB.state, null, message)
                if (SSB.state.error) throw SSB.state.error

                const blobsDir = path.join('~/.ssb/', self.appId, self.appId)
                console.log(blobsDir)

                var currentCache = 'ssb-browser-demo'
                navigator.serviceWorker.controller.postMessage(currentCache)

                caches.open(currentCache).then(function(cache) {
                  pull(
                    pull.values(Object.keys(message.content.blobs)),
                    pull.asyncMap((appPath, cb) => {
                      cache.match(appPath).then(function(response) {
                        if (response != null) return cb()

                        const blobId = message.content.blobs[appPath]
                        console.log(`path: ${appPath} is blob: ${blobId}`)
                        httpGet(SSB.net.blobs.remoteURL(blobId), 'blob', (err, data) => {
                          if (err) return cb(err)
                          data.arrayBuffer().then(function (buffer) {
                            SSB.net.blobs.hash(new Uint8Array(buffer), (err, hash) => {
                              if (err) return cb(err)
                              if ('&' + hash != blobId) return cb(`wrong hash from server, expected ${blobId} got &${hash}`)

                              if (appPath == "index.html")
                              {
                                cache.put(appPath, new Response(data))
                                const file = raf(path.join(blobsDir, appPath))
                                file.write(0, data, (err) => {
                                  if (err) return cb(err)
                                  console.log("wrote blob!", file)
                                  cb()
                                })
                              } else
                                cache.put(appPath, new Response(data)).then(cb)
                            })
                          })
                        })
                      })
                    }),
                    pull.collect((err, msgs) => {
                      if (err) return alert(err)
                      console.log("verified and cached all blobs")

                      const indexFile = raf(path.join(blobsDir, "index.html"))
                      indexFile.stat((err, stat) => {
                        indexFile.read(0, stat.size, (err, data) => {
                          if (err) throw err

                          var indexHTML = data.toString()

                          document.open()
                          document.write(indexHTML)
                          document.close()
                        })
                      })
                    })
                  )
                })
              })
            })
          } else
            alert("Invalid app message id!")
        }
      }
    })
  })
}())
