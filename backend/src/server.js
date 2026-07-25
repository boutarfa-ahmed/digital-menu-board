const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const menuRoutes = require('./routes/menu.routes');
const categoryRoutes = require('./routes/category.routes');
const uploadRoutes = require('./routes/upload.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api/menu', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'GalaxyFood API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
