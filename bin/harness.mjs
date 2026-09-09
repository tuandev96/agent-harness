#!/usr/bin/env node
import { main } from '../dist/cli/main.js'
main(process.argv.slice(2)).catch(error => {
  console.error(JSON.stringify({ok:false,error:error.message}))
  process.exitCode = 1
})
