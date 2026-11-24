import 'dotenv/config';
import express from 'express';
import cors from "cors";
import { errorMiddleware } from '@packages/error-handler/error-middleware';
import cookieParser from 'cookie-parser';
import router from './routes/auth.router';
import swaggerUi from 'swagger-ui-express';


const swaggerDocument = require('./swagger-output.json');

const app = express();

const allowedOrigins = [
  ...Array.from({ length: 10 }, (_, index) => `http://localhost:${3000 + index}`),
  'http://localhost:6001',
];

app.use(cors({
  origin: allowedOrigins,
  allowedHeaders: ['Authorization', 'Content-Type', 'accept'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send({ 'message': 'Hello Api'});
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/docs-json", (req, res) => {
    res.json(swaggerDocument);
});

//routes
app.use("/api", router);

app.use(errorMiddleware);

const port = process.env.PORT || 6001;
const server =app.listen(port, () => {
    console.log(`Auth service is running at http://localhost:${port}/api`);
    console.log(`Swagger Docs available at http://localhost:${port}/api-docs`);
});
server.on('error', (err) => {
    console.log("Server Error:", err);
});