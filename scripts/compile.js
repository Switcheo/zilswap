
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

async function compile(file) {
  const code = (await readFile(file)).toString()
  return compress(code)
  // return code;
}

function compress(code) {
  // return code.replace(matchComments, '').replace(matchWhitespace, ' ')
  return code.replace(matchComments, '')
}

const matchComments = /[(][*].*?[*][)]/gs
const matchWhitespace = /\s+/g

exports.compile = compile
exports.compress = compress
