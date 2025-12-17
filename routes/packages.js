// routes/packages.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de pacotes
router.get('/', (req, res) => res.json({ message: 'Listar pacotes' }));
export default router;
