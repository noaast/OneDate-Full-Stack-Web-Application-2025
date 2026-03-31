import http from "http";
import handleRequest from "./routes/routes.js";

// בדיקת טעינה
console.log("🔥 index.js loaded");

const server = http.createServer((req, res) => {
  console.log("➡️", req.method, req.url);
  handleRequest(req, res);
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
