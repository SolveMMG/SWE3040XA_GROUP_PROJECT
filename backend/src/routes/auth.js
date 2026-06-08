const express = require('express');
const router = express.Router();

// Placeholder — wire up bcrypt + JWT + PostgreSQL in implementation
router.post('/register', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  res.status(201).json({ message: 'User registered (stub)', user: { name, email } });
});

router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  res.json({ message: 'Login successful (stub)', token: 'sample-jwt-token' });
});

module.exports = router;
