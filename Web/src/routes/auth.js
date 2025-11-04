const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.get('/auth/login', AuthController.viewLogin);
router.post('/auth/login', AuthController.doLogin);
router.post('/auth/logout', AuthController.logout);

module.exports = router;
