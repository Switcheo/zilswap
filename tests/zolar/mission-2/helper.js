const adt = (constructor, argtypes, args) => {
  return { constructor, argtypes, arguments: args }
}

module.exports = {
  adt
}