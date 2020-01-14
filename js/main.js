(function() {
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
          if (this.appId != '' && this.appId.startsWith('%')) {
            SSB.remoteAddress = 'ws:localhost:8989~shs:Oh2NQslutj+XQRJkkfzKr6gw5mt49mdYY43Rs33y3yY=.ed25519' // FIXME
            SSB.connected((rpc) => {
              rpc.getThread.get(this.appId, (err, messages) => {
                if (err) return alert("Unable to download application message")

                // FIXME this should find latest version by author or some other form of definition of who gets to release new versions
                var message = messages[0]

                console.log(message)
                
                for (var path in message.content.blobs) {
                  console.log(`path: ${path} is blob: ${message.content.blobs[path]}`)
                }

                // - create directory if it doesn't exist
                // - download all the blobs and place in directory
              })
            })
          } else
            alert("Invalid app message id!")
        }
      }
    })
  })
}())
