// src/routes/home.route.js
import { Router } from 'express';
import * as Home from '../controllers/home.controller.js';
import { ensureAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Home (exige login)
router.get('/', ensureAuth, Home.home);

export default router;
