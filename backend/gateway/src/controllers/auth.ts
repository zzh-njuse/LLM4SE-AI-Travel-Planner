import express from 'express';
import axios from 'axios';

const router = express.Router();

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || 'http://localhost:8081';

// Register
router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(
      `${TRIP_SERVICE_URL}/api/v1/auth/register`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(
      `${TRIP_SERVICE_URL}/api/v1/auth/login`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
