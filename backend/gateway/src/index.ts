import express from 'express'
import healthRouter from './controllers/health'
import authRouter from './controllers/auth'
import configRouter from './controllers/config'
import * as tripController from './controllers/trip'

const app = express()

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  
  next()
})

app.use(express.json())
app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/config', configRouter)

// Trip routes
app.post('/api/v1/trips', tripController.createTrip)
app.get('/api/v1/trips', tripController.getUserTrips)
app.get('/api/v1/trips/:id', tripController.getTripDetail)
app.delete('/api/v1/trips/:id', tripController.deleteTrip)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Gateway listening on ${PORT}`)
})
