const express = require("express");
const { greeting } = require("@{{project-name}}/shared");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: greeting("API") });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
