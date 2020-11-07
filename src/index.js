const express = require("express");
const app = express();
const pool = require("./db");
const { port } = require("../config");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.put("/user/:username", async (req, res) => {
  try {
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.get("/user/:username", async (req, res) => {
  try {
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.post("/subscription", async (req, res) => {
  try {
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.get("/subscription/:username/:specifieddate", async (req, res) => {
  try {
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.listen(port, () => {
  console.log("App is listening on port: ", port);
});
