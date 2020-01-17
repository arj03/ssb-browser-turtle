(function() {
  const path = require('path')
  const raf = require('polyraf')
  const pull = require('pull-stream')

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
          appId: "%bnTRHCyFvPIgMndnCS0+Mq4UQJEdq0cSzgktKp3jAXk=.sha256"
        }
      },
      methods: {
        getapp: function() {
          var self = this
          if (this.appId != '' && this.appId.startsWith('%')) {
            SSB.remoteAddress = 'ws:localhost:8989~shs:Oh2NQslutj+XQRJkkfzKr6gw5mt49mdYY43Rs33y3yY=.ed25519' // FIXME
            SSB.connected((rpc) => {
              rpc.getThread.get(this.appId, (err, messages) => {
                if (err) return alert("Unable to download application message")

                // FIXME this should find latest version by author or some other form of definition of who gets to release new versions
                const message = messages[0]
                console.log(message)

                const blobsDir = path.join('~/.ssb/', self.appId, self.appId)
                console.log(blobsDir)

                // FIXME: maybe a better way to ensure the server can't send us bad blobs
                pull(
                  pull.values(Object.keys(message.content.blobs)),
                  pull.asyncMap((appPath, cb) => {
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
                            const file = raf(path.join(blobsDir, appPath))
                            file.write(0, data, (err) => {
                              console.log("wrote blob!", file)
                              cb(err)
                            })
                          } else
                            cb()
                        })
                      })
                    })
                  }),
                  pull.collect((err, msgs) => {
                    if (err) return alert(err)
                    console.log("verified all blobs")

                    const indexFile = raf(path.join(blobsDir, "index.html"))
                    indexFile.stat((err, stat) => {
                      indexFile.read(0, stat.size, (err, data) => {
                        if (err) throw err

                        var indexHTML = data.toString()

                        for (var localPath in message.content.blobs)
                          indexHTML = indexHTML.replace(localPath, SSB.net.blobs.remoteURL(message.content.blobs[localPath]))

                        document.open()
                        document.write(indexHTML)
                        document.close()
                      })
                    })
                  })
                )
              })
            })
          } else
            alert("Invalid app message id!")
        }
      }
    })
  })
}())
