const express = require('express')
const subscriptionPlansRouter = require('./controllers/subscription_plans')

const app = express()

app.use(express.json())

app.use('/api/subscriptionPlans', subscriptionPlansRouter)
