// routes/payments.js
import express from 'express';
const router = express.Router();
// TODO: Implementar pagamentos de sessões
router.get('/', (req, res) => res.json({ message: 'Listar pagamentos' }));
export default router;
