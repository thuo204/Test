const express = require('express');
const router = express.Router();
const { contactRateLimiter } = require('../middleware/rateLimiter');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { body } = require('express-validator');

router.post('/',
  contactRateLimiter,
  [
    body('name').isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('subject').isLength({ min: 5, max: 255 }),
    body('message').isLength({ min: 10, max: 5000 }),
  ],
  asyncHandler(async (req, res) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    
    const { name, email, subject, message } = req.body;
    await query(
      'INSERT INTO messages (name, email, subject, message, ip_address) VALUES ($1,$2,$3,$4,$5)',
      [name, email, subject, message, req.ip]
    );
    res.status(201).json({ success: true, message: 'Message sent successfully' });
  })
);

module.exports = router;
