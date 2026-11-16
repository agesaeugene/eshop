/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import cors from "cors";
import * as path from 'path';
import proxy from 'express-http-proxy';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import initializeSiteConfig from './libs/initializeSiteConfig';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007',
  'http://localhost:3008',
  'http://localhost:3009',
];

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser clients (no Origin header) and whitelisted UIs
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);

//rate limitter implementation
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: any) => (req.user ? 1000 : 100), // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later!' },
  standardHeaders: true,
  legacyHeaders: true,
  // Remove the keyGenerator entirely - let it use the default
});

app.use(limiter);

app.get('/gateway-healh', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});
app.use("/chatting", proxy("http://localhost:6006"));
app.use("/admin", proxy("http://localhost:6005"));
app.use("/order", proxy("http://localhost:6004"));
app.use("/seller", proxy("http://localhost:6003"));
app.use("/product", proxy("http://localhost:6002"));
app.use("/", proxy("http://localhost:6001"));


const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  try {
    initializeSiteConfig();
    console.log("Site Config initialized Successfully!")
  } catch (error) {
    console.error("Failed to initialize siteconfig:", error);

  }
});
server.on('error', console.error);

// npx kill-port 8080