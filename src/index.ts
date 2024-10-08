import crypto from 'node:crypto'
import { readdirSync, lstatSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { hrtime } from 'node:process'

import * as Clack from '@clack/prompts'
import { globSync } from 'fast-glob'
import color from 'picocolors'
import prettyBytes from 'pretty-bytes'

import { cipherStream, gzipStream } from './stream'
import { percentage, hrtimeToSeconds } from './utils'

const main = async () => {
  Clack.intro(color.inverse(' Pack \'n  Crypt! '))
  Clack.log.message(`Copyright (c) 2024 Maythiwat Chomchuen.\nSource Code: https://github.com/maythiwat/packncrypt2`)

  const mode = await Clack.select({
    message: 'Select operation',
    options: [
      { value: 'encrypt', label: 'Encrypt (original to .xaz)' },
      { value: 'decrypt', label: 'Decrypt (.xaz to original)' },
    ],
  })

  if (Clack.isCancel(mode)) {
    Clack.cancel('User canceled an operation')
    process.exit(0)
  }

  const workingDir = await Clack.text({
    message: 'Working directory',
    initialValue: process.cwd(),
    validate: (value) => {
      try {
        readdirSync(value)
      }catch(_){
        return 'Path is invalid or not a directory'
      }
    }
  })

  if (Clack.isCancel(workingDir)) {
    Clack.cancel('User canceled an operation')
    process.exit(0)
  }

  const files = Array.from(
    globSync(mode == 'decrypt' ? '*.xaz' : ['*', '!*.xaz'], {
      cwd: String(workingDir),
      onlyFiles: true,
      absolute: true,
    })
  )
    .map(f => f.replace(/\//g, path.sep))
    .filter(f => f !== __filename)

  if (files.length == 0) {
    Clack.cancel(`No ${mode}able file found in this directory.`)
    process.exit(0)
  }

  const target = await Clack.select({
    message: `Select file you want to ${mode}`,
    options: files
      .map(f => ({ value: f, label: f }))
  })

  if (Clack.isCancel(target)) {
    Clack.cancel('User canceled an operation')
    process.exit(0)
  }

  const keyString = await Clack.password({
    message: `Enter ${mode}ion key (left blank for default)`,
  })

  if (Clack.isCancel(keyString)) {
    Clack.cancel('User canceled an operation')
    process.exit(0)
  }

  const keyHash = crypto.createHash('sha512').update(keyString ?? '').digest('hex')
  const key = keyHash.substring(0, 32)
  const iv = keyHash.substring(48, 64)

  if (mode == 'encrypt') {
    const fullSize = lstatSync(target as string).size

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    const s = Clack.spinner()

    const t1 = hrtime()
    s.start('File compression')

    const doNext = await gzipStream(
      'zip',
      String(target),
      String(target) + '.xaz.01',
      (bytesRead) => {
        s.message(`Compressing @ ${percentage(fullSize, bytesRead)}% (${prettyBytes(bytesRead)} of ${prettyBytes(fullSize)}) `)
      }
    )
      .then(() => {
        const elapsed = hrtimeToSeconds(hrtime(t1))
        s.stop(`File compression, completed in ${elapsed}s.`)
        return true
      })
      .catch(() => {
        unlinkSync(String(target) + '.xaz.01')
        s.stop('File compression, aborted.')
        Clack.cancel('Failed to compress a file')
        return false
      })

    if (doNext) {
      const t2 = hrtime()
      s.start('File encryption')

      const ok = await cipherStream(
        cipher,
        String(target) + '.xaz.01',
        String(target) + '.xaz',
        (bytesRead) => {
          s.message(`Encrypting @ ${percentage(fullSize, bytesRead)}% (${prettyBytes(bytesRead)} of ${prettyBytes(fullSize)}) `)
        }
      )
        .then(() => {
          unlinkSync(String(target) + '.xaz.01')
          const elapsed = hrtimeToSeconds(hrtime(t2))
          s.stop(`File encryption, completed in ${elapsed}s.`)
          return true
        })
        .catch(() => {
          unlinkSync(String(target) + '.xaz.01')
          unlinkSync(String(target) + '.xap')
          s.stop('File encryption, aborted.')
          Clack.cancel('Failed to encrypt a file')
          return false
        })

      if (ok) {
        Clack.log.success(`Pack \'n Crypt (${mode} mode) successfully!`)
      }
    }
  }

  if (mode == 'decrypt') {
    const fullSize = lstatSync(target as string).size
    const parsedFn = path.parse(String(target).replace(/\.xaz$/, ''))
    const targetOut = path.join(parsedFn.dir, `${parsedFn.name}-${Math.round(new Date().getTime() / 1000)}`)

    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    
    const s = Clack.spinner()

    const t1 = hrtime()
    s.start('File decryption')

    const doNext = await cipherStream(
      cipher,
      String(target),
      targetOut + '.xaz.01',
      (bytesRead) => {
        s.message(`Decrypting @ ${percentage(fullSize, bytesRead)}% (${prettyBytes(bytesRead)} of ${prettyBytes(fullSize)}) `)
      }
    )
      .then(() => {
        const elapsed = hrtimeToSeconds(hrtime(t1))
        s.stop(`File decryption, completed in ${elapsed}s.`)
        return true
      })
      .catch((e) => {
        unlinkSync(targetOut + '.xaz.01')
        s.stop('File decryption, aborted.')
        Clack.cancel(typeof e == 'string' ? e : 'Failed to decrypt a file')
        return false
      })

    if (doNext) {
      const t2 = hrtime()
      s.start('File decompression')

      const ok = await gzipStream(
        'unzip',
        targetOut + '.xaz.01',
        targetOut + parsedFn.ext,
        (bytesRead) => {
          s.message(`Decompressing @ ${percentage(fullSize, bytesRead)}% (${prettyBytes(bytesRead)} of ${prettyBytes(fullSize)}) `)
        }
      )
        .then(() => {
          unlinkSync(targetOut + '.xaz.01')
          const elapsed = hrtimeToSeconds(hrtime(t2))
          s.stop(`File decompression, completed in ${elapsed}s.`)
          return true
        })
        .catch(() => {
          unlinkSync(targetOut + parsedFn.ext)
          s.stop('File decompression, aborted.')
          Clack.cancel('Failed to decompress a file')
          return false
        })

      if (ok) {
        Clack.log.success(`Pack \'n Crypt (${mode} mode) successfully!`)
      }
    }
  }

  const again = await Clack.confirm({
    message: 'What do you want to do next?',
    initialValue: false,
    active: 'Run again',
    inactive: 'Exit'
  })

  if (again && !Clack.isCancel(again)) {
    main()
    return
  }
}

main()
