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
import clinicalToolsRoutes from './routes/clinicalTools.js';
import userPreferencesRoutes from './routes/userPreferences.js';
import productRoutes from './routes/products.js';
import comandaRoutes from './routes/comandas.js';
import peiRoutes from './routes/pei.js';
import neuroAssessmentRoutes from './routes/neuroAssessments.js';
import documentRoutes from './routes/documents.js';
import permissionRoutes from './routes/permissions.js';
import reportRoutes from './routes/reports.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import uploadRoutes from './routes/uploads.js';
import publicBookingRoutes from './routes/publicBooking.js';
import caseStudyRoutes from './routes/caseStudies.js';
import docGeneratorRoutes from './routes/docGenerator.js';
import profileRoutes from './routes/profile.js';

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
app.use('/clinical-tools', clinicalToolsRoutes);
app.use('/user-preferences', userPreferencesRoutes);
app.use('/products', productRoutes);
app.use('/comandas', comandaRoutes);
app.use('/pei', peiRoutes);
app.use('/neuro-assessments', neuroAssessmentRoutes);
app.use('/documents', documentRoutes);
app.use('/permissions', permissionRoutes);
app.use('/reports', reportRoutes);
app.use('/messages', messageRoutes);
app.use('/notifications', notificationRoutes);
app.use('/uploads', uploadRoutes);
app.use('/public-booking', publicBookingRoutes);
app.use('/case-studies', caseStudyRoutes);
app.use('/doc-generator', docGeneratorRoutes);
app.use('/profile', profileRoutes);

// erro 404 simples
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
