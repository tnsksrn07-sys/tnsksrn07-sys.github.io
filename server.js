const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper function to read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, returning empty database structure', err);
    return { clients: [], settings: {}, feedbacks: [] };
  }
}

// Helper function to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB', err);
    return false;
  }
}

// Ensure db.json exists on launch
if (!fs.existsSync(DB_FILE)) {
  writeDB({ clients: [], settings: {}, feedbacks: [] });
}

// --- API Endpoints ---

// 1. Settings GET & POST
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || {});
});

app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = {
    ...db.settings,
    ...req.body
  };
  if (writeDB(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

// 2. Clients GET, PUT, DELETE, BULK-SAVE
app.get('/api/clients', (req, res) => {
  const db = readDB();
  res.json(db.clients || []);
});

app.post('/api/clients/bulk-save', (req, res) => {
  const db = readDB();
  db.clients = req.body;
  if (writeDB(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

app.put('/api/clients/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const index = db.clients.findIndex(c => c.id === id);
  if (index !== -1) {
    db.clients[index] = { ...db.clients[index], ...req.body };
    if (writeDB(db)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Database write failed' });
    }
  } else {
    // If not found, automatically register them using their request payload details
    const defaultPassword = req.body.phone || "user@123";
    const newClient = {
      id,
      username: req.body.username || (req.body.email ? req.body.email.split('@')[0] : "user_" + Date.now()),
      fullName: req.body.fullName || "New Investor",
      email: req.body.email || "",
      phone: req.body.phone || "",
      address: req.body.address || "",
      profession: req.body.profession || "",
      dob: req.body.dob || "",
      password: req.body.password || defaultPassword,
      walletBalance: req.body.walletBalance || 0,
      walletProfit: req.body.walletProfit || 0,
      withdrawError: req.body.withdrawError || "",
      investments: req.body.investments || [],
      withdrawals: req.body.withdrawals || [],
      registeredAt: req.body.registeredAt || new Date().toISOString(),
      loginHistory: req.body.loginHistory || [],
      lastLoginDate: req.body.lastLoginDate || new Date().toISOString()
    };
    db.clients.push(newClient);
    if (writeDB(db)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Database write failed' });
    }
  }
});

app.delete('/api/clients/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.clients = db.clients.filter(c => c.id !== id);
  if (writeDB(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

// 3. Authentication & Sign Up Endpoints
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const client = db.clients.find(c =>
    (c.email.toLowerCase() === email.toLowerCase() || (c.username && c.username.toLowerCase() === email.toLowerCase())) &&
    c.password === password
  );
  if (client) {
    res.json({ success: true, client });
  } else {
    res.json({ success: false, message: 'Invalid email/username or password' });
  }
});

app.post('/api/check-user', (req, res) => {
  const { email, username } = req.body;
  const db = readDB();
  const emailExists = db.clients.some(c => c.email.toLowerCase() === email.toLowerCase());
  const usernameExists = db.clients.some(c => c.username && c.username.toLowerCase() === username.toLowerCase());
  if (emailExists || usernameExists) {
    res.json({ success: false, message: 'Email or Username is already registered!' });
  } else {
    res.json({ success: true });
  }
});

app.post('/api/signup', (req, res) => {
  const newUser = req.body;
  const db = readDB();
  db.clients.push(newUser);
  if (writeDB(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

// 4. Feedbacks Endpoints
app.get('/api/feedbacks', (req, res) => {
  const db = readDB();
  res.json(db.feedbacks || []);
});

app.post('/api/feedbacks', (req, res) => {
  const { name, rating, comment, date, image } = req.body;
  const db = readDB();
  const newFeedback = {
    id: 'fb-' + Date.now(),
    name,
    rating: parseInt(rating) || 5,
    comment,
    image,
    date: date || new Date().toISOString().substring(0, 10)
  };
  if (!db.feedbacks) db.feedbacks = [];
  db.feedbacks.unshift(newFeedback); // Add to beginning
  if (writeDB(db)) {
    res.json(newFeedback);
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

app.delete('/api/feedbacks/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.feedbacks = (db.feedbacks || []).filter(f => f.id !== id);
  if (writeDB(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Database write failed' });
  }
});

// 5. Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const db = readDB();
  const settings = db.settings || {};

  if (settings.smtp_user && settings.smtp_pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host || 'smtp.gmail.com',
        port: parseInt(settings.smtp_port) || 465,
        secure: parseInt(settings.smtp_port) === 465,
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        }
      });
      await transporter.sendMail({
        from: `"Next Billion Support" <${settings.smtp_user}>`,
        to: email,
        subject: "Next Billion Investment - Email Verification OTP",
        text: `Your 6-digit verification code is: ${otp}\n\nPlease enter this code on the website to complete your registration.`,
        html: `<p>Your 6-digit verification code is: <b>${otp}</b></p><p>Please enter this code on the website to complete your registration.</p>`
      });
      res.json({ success: true, otp, simulated: false });
    } catch (err) {
      console.error('SMTP Email Error:', err);
      res.status(500).json({ success: false, error: 'Failed to send OTP email: ' + err.message });
    }
  } else {
    res.json({ success: true, otp, simulated: true });
  }
});

// Serve config.js
app.get('/config.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'config.js'));
});

// Serve frontend assets
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  etag: true,
  lastModified: true,
  maxAge: '1d'
}));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
