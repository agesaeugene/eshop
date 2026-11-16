
import express from 'express';
import cookieParser from "cookie-parser";
import { createWebSocketServer } from './websocket';
import router from './routes/chat.routes';


const app = express();
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => {
  res.send({ message: 'Welcome to chatting-service!' });
});

// routes
app.use("/api", router);

const port = process.env.PORT || 6006;

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);

// websocket server
createWebSocketServer(server).catch((error) => {
  console.error("WebSocket startup failed:", error);
});
