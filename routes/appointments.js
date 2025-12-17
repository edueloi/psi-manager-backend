// routes/appointments.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de agendamentos
router.get('/', (req, res) => res.json({ message: 'Listar agendamentos' }));
export default router;
