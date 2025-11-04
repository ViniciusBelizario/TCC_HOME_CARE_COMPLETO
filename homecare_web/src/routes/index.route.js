// src/routes/index.route.js
import { Router } from 'express';
import * as Home from '../controllers/home.controller.js';
import { ensureAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// rotas públicas
router.get('/login', Home.login);
router.post('/login', Home.postLogin);
router.post('/logout', Home.logout);

// rotas protegidas
router.get('/', ensureAuth, Home.home);

export default router;
