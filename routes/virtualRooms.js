// routes/virtualRooms.js
import express from 'express';
const router = express.Router();
// TODO: Implementar links de sala virtual
router.get('/', (req, res) => res.json({ message: 'Listar salas virtuais' }));
export default router;
