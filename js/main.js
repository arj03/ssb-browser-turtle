(function() {
  const path = require('path')
  const raf = require('polyraf')
  const pull = require('pull-stream')

  if (location.protocol === 'https:' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js')
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
          appId: "%OLMcT/yciEB3rFLaNa50Ta7ZSwwPdEgyEo9WUGejJLs=.sha256|@6CAxOI3f+LUOVrbAl0IemqiS7ATpQvr9Mdw9LC4+Uv0=.ed25519",
          remoteAddress: 'wss:between-two-worlds.dk:8989~shs:lbocEWqF2Fg6WMYLgmfYvqJlMfL7hiqVAV6ANjHWNw8=.ed25519',
          appDir: '',
          appVersion: '',
          apps: [],

          // new app dialog
          showNewAppModal: false,
          newAppMessage: ''
        }
      },
      created: function () {
        SSB.remoteAddress = this.remoteAddress

        const localApps = JSON.parse(localStorage['apps'] || "{}")

        this.apps = Object.values(localApps)
      },
      methods: {
        loadapp: function(name, blobsDir) {
          navigator.serviceWorker.controller.postMessage(name)

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
        },
        getapp: function() {
          var self = this
          if (self.appId != '' && self.appId.startsWith('%')) {
            SSB.connected((rpc) => {
              let author, appRootId
              [appRootId, author] = self.appId.split('|')
              rpc.getThread.get(appRootId, (err, messages) => {
                if (err) return alert("Unable to download application message")

                const message = messages.filter(x => x.author == author).pop()
                console.log(message)

                SSB.state = SSB.validate.appendOOO(SSB.state, null, message)
                if (SSB.state.error) throw SSB.state.error

                self.appDir = appRootId
                self.appVersion = appRootId
                self.newAppMessage = message.content
                self.showNewAppModal = true
              })
            })
          } else
            alert("Invalid app message id!")
        },
        loadNewApp: function() {

          var self = this

          const blobsDir = path.join('~/.ssb/', self.appDir, self.appVersion)
          console.log(blobsDir)

          const appName = self.newAppMessage.name
          navigator.serviceWorker.controller.postMessage(appName)

          caches.open(appName).then(function(cache) {
            pull(
              pull.values(Object.keys(self.newAppMessage.blobs)),
              pull.asyncMap((appPath, cb) => {
                cache.match(appPath).then(function(response) {
                  if (response != null) return cb() // FIXME: check size here probably

                  const blobId = self.newAppMessage.blobs[appPath]
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
              pull.collect((err) => {
                if (err) return alert(err)

                console.log("verified and cached all blobs")

                var apps = JSON.parse(localStorage['apps'] || "{}")
                apps[appName] = Object.assign({ blobsDir }, self.newAppMessage)
                localStorage['apps'] = JSON.stringify(apps)

                self.apps = Object.values(apps)

                self.loadapp(appName, blobsDir)
              })
            )
          })
        }
      }
    })
  })
}())
