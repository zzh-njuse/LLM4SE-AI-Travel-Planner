import express from 'express'
import healthRouter from './controllers/health'

const app = express()
app.use(express.json())
app.use('/api/v1/health', healthRouter)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Gateway listening on ${PORT}`)
})
