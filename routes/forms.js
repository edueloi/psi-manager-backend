// routes/forms.js
import express from 'express';
const router = express.Router();
// TODO: Implementar CRUD de formulários
router.get('/', (req, res) => res.json({ message: 'Listar formulários' }));
export default router;
