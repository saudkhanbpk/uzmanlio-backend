import { requestLogger } from './middlewares/debugMiddleware.js';
import express from 'express';
import cors from 'cors';
const app = express();

// Add early in your middleware chain
// app.use(requestLogger);

// Ensure CORS is configured properly
app.use(cors({
    origin: true,
    credentials: true
}));

// Add headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
});