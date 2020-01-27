const fs = require('fs')
const path = require('path')
const pull = require('pull-stream')
const rimraf = require("rimraf")

var html = fs.readFileSync("index.html", 'utf-8')

function copyToDist(line, type, match) {
  var filepath = match[1]
  var extension = path.extname(filepath)
  var filename = path.basename(filepath, extension)
  var stat = fs.statSync(filepath)
  var fixedFilename = filename + "." + parseInt(stat.mtimeMs).toString() + extension
  console.log(fixedFilename)
  fs.copyFileSync(filepath, path.join('dist', type, fixedFilename))
  return line.replace(filepath, path.join(type, fixedFilename))
}

rimraf("dist", function () {
  fs.mkdirSync('dist')
  fs.mkdirSync('dist/css')
  fs.mkdirSync('dist/js')

  // other
  fs.copyFileSync('js/sw.js', 'dist/sw.js')
  fs.copyFileSync('hermies.gif', 'dist/hermies.gif')
  fs.copyFileSync('turtle-flipped.png', 'dist/turtle-flipped.png')

  pull(
    pull.values(html.split('\n')),
    pull.map(line => {
      var script = line.match(/<script src="(.*?)"/)
      var css = line.match(/text\/css\" href="(.*?)"/)
      if (script)
	return copyToDist(line, 'js', script)
      else if (css)
	return copyToDist(line, 'css', css)
      else
	return line
    }),
    pull.collect((err, lines) => {
      if (err) return console.log(err)
      fs.writeFileSync('dist/index.html', lines.join('\n'))
    })
  )
})
