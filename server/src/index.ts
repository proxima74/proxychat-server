import express from "express";
import cors from "cors";
import { createServer } from "http";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    app: "ProxyChat",
    status: "online",
    version: "0.1.0",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

const PORT = 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ProxyChat server running on port ${PORT}`);
});

