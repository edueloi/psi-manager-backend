// routes/sessions.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de sessões
router.get('/', (req, res) => res.json({ message: 'Listar sessões' }));
export default router;
