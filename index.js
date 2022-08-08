require('dotenv').config()
const { deployZilswap } = require('./scripts/deploy.js')

deployZilswap(process.env.PRIVATE_KEY, {})
