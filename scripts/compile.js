
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

async function compile() {
  const code = (await readFile('./src/ZilSwap.scilla')).toString()
  return compress(code)
}

function compress(code) {
  return code.replace(matchComments, '').replace(matchWhitespace, ' ')
}

const matchComments = /[(][*].*?[*][)]/gs
const matchWhitespace = /\s+/g

exports.compile = compile
exports.compress = compress
