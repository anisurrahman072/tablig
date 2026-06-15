require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
const connectDB = require('./config/db');
const { seedMasjids, seedSchools, seedSuperAdmin } = require('./config/seed');
const { errorHandler } = require('./utils/errors');

const authRoutes = require('./routes/auth');
const masjidRoutes = require('./routes/masjids');
const schoolRoutes = require('./routes/schools');
const adminRoutes = require('./routes/admin');
const constantsRoutes = require('./routes/constants');
const personRoutes = require('./routes/persons');
const personSmsRoutes = require('./routes/personSms');
const batchSmsRoutes = require('./routes/batchSms');
const smsHistoryRoutes = require('./routes/smsHistory');
const karguzariRoutes = require('./routes/karguzari');

const app = express();
const PORT = process.env.PORT || 3004;

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'সার্ভার চালু আছে' });
});

app.get('/api/wakeup', (req, res) => {
  console.log('[wakeup] Server now awake');
  res.json({ success: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/masjids', masjidRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/persons/:id/sms', personSmsRoutes);
app.use('/api/sms/batches', batchSmsRoutes);
app.use('/api/sms/history', smsHistoryRoutes);
app.use('/api/persons/:id/karguzari', karguzariRoutes);

app.use(errorHandler);

async function start() {
  await connectDB();
  await seedMasjids();
  await seedSchools();
  await seedSuperAdmin();
  app.listen(PORT, () => {
    const lanIp = getLanIp();
    const mobileUrl = `http://${lanIp}:${PORT}/api`;
    const boxLine = '─'.repeat(mobileUrl.length + 4);

    console.log('');
    console.log('  ✅  তাবলিগ সার্ভার চালু হয়েছে');
    console.log('');
    console.log(`  🖥️   Local  : http://localhost:${PORT}/api`);
    console.log(`  📱  Network : ${mobileUrl}`);
    console.log('');
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`  🌐  Render URL: ${process.env.RENDER_EXTERNAL_URL}/api`);
      console.log(`  👉  apps/mobile/.env এ এই লাইনটি দিন:`);
      console.log(`  EXPO_PUBLIC_API_URL=${process.env.RENDER_EXTERNAL_URL}/api`);
    } else {
      console.log(`  ┌${boxLine}┐`);
      console.log(`  │  apps/mobile/.env এ এই লাইনটি দিন:    │`);
      console.log(`  │                                        │`);
      console.log(`  │  EXPO_PUBLIC_API_URL=${mobileUrl}  │`);
      console.log(`  └${boxLine}┘`);
    }
    console.log('');
  });
}

start().catch((err) => {
  console.error('সার্ভার শুরু ব্যর্থ:', err.message);
  process.exit(1);
});
