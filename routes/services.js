// routes/services.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de serviços
router.get('/', (req, res) => res.json({ message: 'Listar serviços' }));
export default router;
