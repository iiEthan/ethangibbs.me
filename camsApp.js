import { join, dirname } from 'path'
import { Low, JSONFile } from 'lowdb'
import { fileURLToPath } from 'url'
import bcrypt from 'bcrypt'
import express from 'express'

// Must use require to import json file
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const json = require('./passcode.json')

const __dirname = dirname(fileURLToPath(import.meta.url))

// Use JSON file for storage
const file = join(__dirname, './public/OpenCams/db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

// Create new express instance
export const cams = express()

cams.use(express.json({ limit: "1mb" })) // Prevent db from flooding

// POST cam
cams.post("/api/:id", async (request, response) => {
  const cam = request.body
  
  // Verify validity of data before pushing
  const validate = await validateData(cam)
  delete cam.passcode
  
  if (validate[0]) {
    await db.read()   
    db.data.cam.push(cam)
    await db.write()
  }
  
  response.json({
    status: validate,
    body: request.body
  })
})

// GET all cams
cams.get('/api', async (request, response) => {
  await db.read()
  response.json(db.data)
})

// GET specific cam
cams.get('/api/:id', async (request, response) => {
  const id = request.params.id - 1
  await db.read()
  response.json(db.data.cam[id])
})

// DELETE cam
cams.delete('/api/:id', async (request, response) => {
  const cam = request.body
  await db.read()
  let cameras = db.data.cam
  
  // Verify validity of data before pushing
  const validate = await validateData(cam)
  delete cam.passcode
  
  // Remove item from the cam array
  if (validate[0]) {
    cameras = cameras.filter(i => i.id !== cam.id)
    let count = 1
    cameras.forEach(camera => {
      camera.id = count
      count++
    })
    
    db.data.cam = cameras
    db.write()
  }
  
  response.json({
    status: validate,
    body: request.body
  })
})

// UPDATE cam
cams.patch("/api/:id", async (request, response) => {
  const cam = request.body
  const id = Number(request.params.id)
  cam.id = id
  
  // Verify validity of data before pushing
  const validate = await validateData(cam)
  delete cam.passcode
  
  if (validate[0]) {
    await db.read()   
    db.data.cam[id-1] = cam
    await db.write()
  }
  
  response.json({
    status: validate,
    body: request.body
  })
})

// Verify password and data integrity
async function validateData(content) {
  // Check to see if all keys are in object
  if ("title" in content && "url" in content && "id" in content) {
    if (await bcrypt.compare(content.passcode, json.hash)) {
      return [true, "Success"]
    } else {
      return [false, "Failed: Incorrect password"]
    }
  } else {
    return [false, "Failed: Bad data formatting"]
  } 

}