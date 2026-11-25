#!/usr/bin/env node
import { syncPendingFromPhrases } from './lib.mjs'

const result = syncPendingFromPhrases()
console.log(`Synced ${result.added} pending phrase(s). Queue size: ${result.total}.`)
