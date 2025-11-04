import { Router } from 'express';
import * as Rel from '../controllers/relatorio.controller.js';

const router = Router();

router.get('/', Rel.index);

export default router;
