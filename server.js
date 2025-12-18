import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import serviceRoutes from './routes/services.js';
import packageRoutes from './routes/packages.js';
import appointmentRoutes from './routes/appointments.js';
import sessionRoutes from './routes/sessions.js';
import formRoutes from './routes/forms.js';
import medicalRecordRoutes from './routes/medicalRecords.js';
import paymentRoutes from './routes/payments.js';
import virtualRoomRoutes from './routes/virtualRooms.js';
import tenantRoutes from './routes/tenants.js';

dotenv.config();

const app = express();
app.use(cors()); // Adiciona o middleware do CORS
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'psi-manager-backend' });
});

app.get('/health/db', async (req, res) => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: r[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// rotas
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tenants', tenantRoutes);
app.use('/patients', patientRoutes);
app.use('/services', serviceRoutes);
app.use('/packages', packageRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/sessions', sessionRoutes);
app.use('/forms', formRoutes);
app.use('/medical-records', medicalRecordRoutes);
app.use('/payments', paymentRoutes);
app.use('/virtual-rooms', virtualRoomRoutes);

// erro 404 simples
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
