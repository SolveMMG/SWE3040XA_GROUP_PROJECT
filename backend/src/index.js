require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health');
const ridesRouter = require('./routes/rides');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RideConnect API',
    version: '1.0.0',
    description: 'Smart carpooling platform for Nairobi Metropolitan Region',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/auth', authRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`RideConnect API running on port ${PORT}`);
});

module.exports = app;
