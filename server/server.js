require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const { runSeed } = require('./utils/seed');

// Fail fast with a clear message instead of a mysterious 500 on the first login
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Add it to your environment variables (Render: Environment tab).');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render terminates TLS in front of the app (needed for rate limiting)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || false, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schools', require('./routes/schools'));
app.use('/api/references', require('./routes/references'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/documents', require('./routes/documents'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res) => res.status(404).json({ message: 'Onbekend API-adres.' }));

// Serve the built React app (single Render web service)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => res.sendFile(path.join(clientBuildPath, 'index.html')));

app.use((err, req, res, next) => {
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ message: err.message || 'Er ging iets mis.' });
});

const PORT = process.env.PORT || 5050;

(async () => {
  await connectDB();
  if (process.env.AUTO_SEED !== 'false') {
    try { await runSeed(); } catch (err) { console.error('[seed] failed:', err.message); }
  }
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
