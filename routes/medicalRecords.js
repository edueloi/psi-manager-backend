// routes/medicalRecords.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de prontuários
router.get('/', (req, res) => res.json({ message: 'Listar prontuários' }));
export default router;
