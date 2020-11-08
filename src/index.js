const express = require("express");
const app = express();
const pool = require("./db");
const cors = require("cors");
const { port } = require("../config");
const { isNULLEMPTYORUNDEFINED, getISTTime } = require("./Utility");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.put("/user/:username", async (req, res) => {
  try {
    let user_name = req.params["username"];
    if (isNULLEMPTYORUNDEFINED(user_name))
      return res.status(400).send({ errorMessage: "Invalid Username" });
    let client = await pool.connect();
    user_name = user_name.toLocaleLowerCase();
    try {
      await client.query("BEGIN");
      let checkUserAlreadyExistsQueryRes = await client.query(
        `SELECT USER_NAME FROM USERS WHERE USER_NAME = $1`,
        [`${user_name}`]
      );
      if (checkUserAlreadyExistsQueryRes.rowCount > 0) {
        client.release();
        return res.status(409).send({ errorMessage: "User already exists" });
      }
      let indianStandardTime = getISTTime();
      await client.query(
        `INSERT INTO USERS(USER_NAME, CREATED_AT) VALUES($1, $2)`,
        [`${user_name}`, `${indianStandardTime}`]
      );
      await client.query("COMMIT");
      client.release();
      return res.status(200).send({ Response: "User creation successfull" });
    } catch (e) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(500).send({ errorMessage: "Internal Server Error" });
    }
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.get("/user/:username", async (req, res) => {
  try {
    let user_name = req.params["username"];
    if (isNULLEMPTYORUNDEFINED(user_name))
      return res.status(400).send({ errorMessage: "Invalid Username" });
    let client = await pool.connect();
    user_name = user_name.toLocaleLowerCase();
    let getUserDetailsQueryRes = await client.query(
      `SELECT USER_NAME, CREATED_AT FROM USERS WHERE USER_NAME = $1`,
      [`${user_name}`]
    );
    client.release();
    if (getUserDetailsQueryRes.rowCount === 0) {
      return res.status(404).send({ errorMessage: "User not found!" });
    } else {
      getUserDetailsQueryRes = getUserDetailsQueryRes.rows[0];
      return res.status(200).send({ Response: getUserDetailsQueryRes });
    }
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
