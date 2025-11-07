// src/routes/cadastro.routes.js
import express from 'express';
import * as cadastroController from '../controllers/cadastro.controller.js';

const router = express.Router();

router.get('/', cadastroController.getCadastroPage);
router.post('/attendant', cadastroController.postCreateAttendant);
router.post('/doctor', cadastroController.postCreateDoctor);
router.get('/doctors', cadastroController.getDoctors);
router.get('/attendants', cadastroController.getAttendants);


export default router;
