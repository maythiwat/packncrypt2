import { Cipher } from 'crypto'
import { createReadStream, createWriteStream } from 'fs'
import { createGunzip, createGzip } from 'zlib'

export const cipherStream = (
  cipher: Cipher,
  input: string,
  output: string,
  onProgress: (bytesRead: number) => void = () => {}
) => new Promise((resolve, reject) => {
  const inputStream = createReadStream(input)
  const outputStream = createWriteStream(output)

  inputStream.on('data', (c: Buffer) => {
    outputStream.write(cipher.update(c))
    onProgress(inputStream.bytesRead)
  })

  inputStream.on('close', () => {
    try {
      outputStream.write(cipher.final())
      outputStream.close()
      onProgress(inputStream.bytesRead)
      resolve(true)
    }catch(e){
      outputStream.close()
      reject('Invalid decryption key')
    }
  })

  inputStream.on('error', (e) => {
    outputStream.destroy(e)
    reject(e)
  })
})

export const compressFile = (
  input: string,
  output: string,
  onProgress: (bytesRead: number) => void = () => {}
) => new Promise((resolve, reject) => {
  const inputStream = createReadStream(input).pipe(createGzip())
  const outputStream = createWriteStream(output)

  inputStream.on('data', (c: Buffer) => {
    outputStream.write(c)
    onProgress(inputStream.bytesWritten)
  })

  inputStream.on('close', () => {
    outputStream.close()
    onProgress(inputStream.bytesWritten)
    resolve(true)
  })

  inputStream.on('error', (e) => {
    outputStream.destroy(e)
    reject(e)
  })
})

export const decompressFile = (
  input: string,
  output: string,
  onProgress: (bytesRead: number) => void = () => {}
) => new Promise((resolve, reject) => {
  
  const outputStream = createWriteStream(output)
  const inputStream = createReadStream(input).pipe(createGunzip())

  inputStream.on('data', (c: Buffer) => {
    outputStream.write(c)
    onProgress(inputStream.bytesWritten)
  })

  inputStream.on('close', () => {
    outputStream.close()
    onProgress(inputStream.bytesWritten)
    resolve(true)
  })

  inputStream.on('error', (e) => {
    outputStream.destroy(e)
    reject(e)
  })
})
