const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authMiddleware = require('./middleware/authMiddleware'); // Import middleware
const adminMiddleware = require('./middleware/adminMiddleware'); // Import admin middleware
const schemasRouter = require('./routes/schemas');
const usersRouter = require('./routes/users'); // Import router mới
const tagsRouter = require('./routes/tags'); // Import router mới

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // for local development
  'http://localhost:3001',
  'https://bypass-tienz-xuy6.vercel.app', // your vercel app
  'https://bypass-tienz.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Import routes
const rolesRouter = require('./routes/roles');
const authRouter = require('./routes/auth');
const toolsRouter = require('./routes/tools');
const crawlRouter = require('./routes/crawl'); // Thêm router mới
const projectsRouter = require('./routes/projects'); // Thêm router mới
const keywordsRouter = require('./routes/keywords'); // Thêm router mới
const rankCheckerRouter = require('./routes/rank-checker'); // Thêm router mới
const keywordCheckerRouter = require('./routes/keyword-checker'); // Import router mới
const linkPositionCheckerRouter = require('./routes/link-position-checker'); // Import router mới

// Use routes
app.use('/api/roles', rolesRouter);
app.use('/api/auth', authRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/rank-checker', rankCheckerRouter);
app.use('/api/keyword-checker', keywordCheckerRouter); // Sử dụng router mới
app.use('/api/link-position-checker', linkPositionCheckerRouter); // Sử dụng router mới
app.use('/api/schemas', authMiddleware, schemasRouter); // Sử dụng router mới
app.use('/api/tags', tagsRouter); // Using the new router

// Protected Routes
app.use('/api/crawl', authMiddleware, crawlRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/keywords', authMiddleware, keywordsRouter);
app.use('/api/schemas', authMiddleware, schemasRouter);

// Admin Routes
app.use('/api/users', authMiddleware, adminMiddleware, usersRouter); // Sử dụng router mới


app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
