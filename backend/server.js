import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';

// Setup environment variables
dotenv.config();

// Resolve paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // support large base64 strings if needed
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Uploads Folder Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Mini Social Post API is running...');
});

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media';

console.log('Attempting connection to MongoDB at:', mongoURI);
mongoose.connect(mongoURI)
  .then(() => {
    console.log('=========================================');
    console.log('  SUCCESS: Connected to MongoDB Database');
    console.log('=========================================');
  })
  .catch((err) => {
    console.error('=========================================');
    console.error('  ERROR: Could not connect to MongoDB!');
    console.error('  Please ensure MongoDB is installed and running locally.');
    console.error('  Connection String attempted:', mongoURI);
    console.error('  Error Details:', err.message);
    console.error('=========================================');
    console.warn('  PRO-TIP: Make sure your local MongoDB service is active');
    console.warn('  (e.g., Run `net start MongoDB` on Windows or `mongod` in console)');
    console.error('=========================================');
  });

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
