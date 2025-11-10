// src/routes/index.route.js
import { Router } from 'express';
import * as Home from '../controllers/home.controller.js';

const router = Router();

// Rotas públicas de autenticação
router.get('/login', Home.login);
router.post('/login', Home.postLogin);
router.post('/logout', Home.logout);

export default router;
