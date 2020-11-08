const express = require("express");
const app = express();
const pool = require("./db");
const cors = require("cors");
const { port } = require("../config");
const {
  getISTTime,
  userNameFormatter,
  calculateExpiryDate,
  formatPlanExpiryDate,
  getISTTimeWithoutHMS,
  isNULLEMPTYORUNDEFINED,
} = require("./Utility");
const { paymentsEndpoint } = require("../config");
const Axios = require("axios");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const getUserDetailsQuery = `SELECT USER_NAME, CREATED_AT FROM USERS WHERE USER_NAME = $1`;

const userAlreadyExists = async (user_name, client) => {
  let checkUserAlreadyExistsQueryRes = await client.query(getUserDetailsQuery, [
    `${user_name}`,
  ]);
  return checkUserAlreadyExistsQueryRes.rowCount > 0;
};

const getUserDetails = async (user_name, client) => {
  let checkUserAlreadyExistsQueryRes = await client.query(getUserDetailsQuery, [
    `${user_name}`,
  ]);
  return checkUserAlreadyExistsQueryRes.rows || [];
};

const updatePaymentStatus = async (
  client,
  user_name,
  status,
  payment_id,
  amount
) => {
  let getCurTime = getISTTime();
  await client.query(
    `INSERT INTO USER_PAYMENTS(USER_NAME, PAYMENT_ID, STATUS, PAYMENT_DATE, AMOUNT) VALUES($1, $2, $3, $4, $5)`,
    [`${user_name}`, `${payment_id}`, `${status}`, `${getCurTime}`, amount]
  );
};

app.put("/user/:username", async (req, res) => {
  try {
    let user_name = req.params["username"];
    if (isNULLEMPTYORUNDEFINED(user_name))
      return res.status(400).send({ errorMessage: "Invalid Username" });
    let client = await pool.connect();
    user_name = userNameFormatter(user_name);
    try {
      let userAlreadyExistsRes = await userAlreadyExists(user_name, client);
      if (userAlreadyExistsRes) {
        client.release();
        return res.status(409).send({ errorMessage: "User already exists" });
      }
      let indianStandardTime = getISTTime();
      await client.query(
        `INSERT INTO USERS(USER_NAME, CREATED_AT) VALUES($1, $2)`,
        [`${user_name}`, `${indianStandardTime}`]
      );
      client.release();
      return res.status(200).send({ Response: "User creation successfull" });
    } catch (e) {
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
    user_name = userNameFormatter(user_name);
    let getUserDetailsQueryRes = await client.query(getUserDetailsQuery, [
      `${user_name}`,
    ]);
    client.release();
    if (getUserDetailsQueryRes.rowCount === 0) {
      return res.status(404).send({ errorMessage: "User not found!" });
    } else {
      getUserDetailsQueryRes = getUserDetailsQueryRes.rows[0];
      return res.status(200).send(getUserDetailsQueryRes);
    }
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.post("/subscription", async (req, res) => {
  try {
    let { user_name, plan_id, start_date } = req.body;
    if (
      isNULLEMPTYORUNDEFINED(user_name) ||
      isNULLEMPTYORUNDEFINED(plan_id) ||
      isNULLEMPTYORUNDEFINED(start_date)
    )
      return res.status(400).send({ errorMessage: "Bad request" });
    user_name = userNameFormatter(user_name);
    let client = await pool.connect();
    let userAlreadyExistsRes = await userAlreadyExists(user_name, client);
    if (!userAlreadyExistsRes) {
      return res.status(404).send({ errorMessage: "User not found!" });
    }
    user_name = userNameFormatter(user_name);
    let getPlanDetails = await client.query(
      `SELECT * FROM PLAN_DETAILS WHERE PLAN_ID = $1`,
      [`${plan_id}`]
    );
    if (getPlanDetails.rowCount === 0)
      return res.status(400).send({ errorMessage: "Invalid Plan Details" });
    getPlanDetails = getPlanDetails.rows[0];
    let validityForGivenPlan = getPlanDetails.validity;
    let costInUSDForGivenPlan = getPlanDetails.cost_in_usd;

    let getUserExistingSubscriptionDetails = await client.query(
      `SELECT US.USER_NAME, US.PLAN_ID, US.START_DATE, US.SUBSCRIBED_ON, 
    PD.VALIDITY, PD.COST_IN_USD FROM USER_SUBSCRIPTIONS US JOIN PLAN_DETAILS PD ON US.PLAN_ID = PD.PLAN_ID WHERE US.USER_NAME = $1 
    ORDER BY US.SUBSCRIBED_ON DESC NULLS LAST LIMIT 1`,
      [`${user_name}`]
    );

    let isSubscriptionOverlapping = false,
      existingPlanCost = 0;
    if (getUserExistingSubscriptionDetails.rowCount === 0) {
      isSubscriptionOverlapping = false;
    } else {
      getUserExistingSubscriptionDetails =
        getUserExistingSubscriptionDetails.rows[0];

      let existingPlanStartDate = getUserExistingSubscriptionDetails.start_date;
      start_date = getISTTimeWithoutHMS(start_date);
      existingPlanStartDate = getISTTimeWithoutHMS(existingPlanStartDate);
      existingPlanCost = getUserExistingSubscriptionDetails.cost_in_usd;
      let { validity } = getUserExistingSubscriptionDetails;
      if (validity === -1) {
        if (start_date >= existingPlanStartDate)
          isSubscriptionOverlapping = true;
      } else if (validityForGivenPlan === -1) {
        if (start_date <= existingPlanStartDate)
          isSubscriptionOverlapping = true;
      } else {
        let existingPlanExpiryDate = calculateExpiryDate(
          existingPlanStartDate,
          validity
        );
        existingPlanExpiryDate = getISTTimeWithoutHMS(existingPlanExpiryDate);
        let newPlanExpiryDate = calculateExpiryDate(
          start_date,
          validityForGivenPlan
        );
        newPlanExpiryDate = getISTTimeWithoutHMS(newPlanExpiryDate);

        if (
          (existingPlanStartDate >= start_date &&
            existingPlanStartDate <= newPlanExpiryDate) ||
          (existingPlanExpiryDate >= start_date &&
            existingPlanExpiryDate <= newPlanExpiryDate)
        ) {
          isSubscriptionOverlapping = true;
        }
      }
    }
    let finalCost = 0;
    if (!isSubscriptionOverlapping) {
      finalCost = costInUSDForGivenPlan;
    } else {
      finalCost = costInUSDForGivenPlan - existingPlanCost;
    }

    let data = {};
    data.user_name = user_name;
    data.payment_type = finalCost >= 0 ? "DEBIT" : "CREDIT";
    data.amount = parseFloat(finalCost);
    if (finalCost !== 0) {
      Axios.post(paymentsEndpoint, data)
        .then(async (Response) => {
          let status =
            (Response && Response.data && Response.data.status) || "FAILURE";
          let payment_id =
            (Response && Response.data && Response.data.payment_id) || "";
          await updatePaymentStatus(
            client,
            user_name,
            status,
            payment_id,
            finalCost
          );
          if (status === "SUCCESS") {
            let getCurrentTime = getISTTime();
            await client.query(
              `INSERT INTO USER_SUBSCRIPTIONS(USER_NAME, PLAN_ID, PAYMENT_ID, START_DATE, SUBSCRIBED_ON) 
            VALUES($1, $2, $3, $4, $5)`,
              [
                `${user_name}`,
                `${plan_id}`,
                `${payment_id}`,
                `${start_date}`,
                `${getCurrentTime}`,
              ]
            );
          }
          client.release();
          return res.status(200).send({ status, amount: finalCost });
        })
        .catch(async (err) => {
          await updatePaymentStatus(
            client,
            user_name,
            "FAILURE",
            "",
            finalCost
          );
          client.release();
          return res
            .status(500)
            .send({ errorMessage: "Internal Server Error. " + err });
        });
    } else {
      let getCurrentTime = getISTTime();
      await client.query(
        `INSERT INTO USER_SUBSCRIPTIONS(USER_NAME, PLAN_ID, PAYMENT_ID, START_DATE, SUBSCRIBED_ON) 
      VALUES($1, $2, $3, $4, $5)`,
        [
          `${user_name}`,
          `${plan_id}`,
          `FREE_OR_TRAIL_OR_SAME_PLAN`,
          `${start_date}`,
          `${getCurrentTime}`,
        ]
      );
      client.release();
      return res.status(200).send({ status: "SUCCESS", amount: finalCost });
    }
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.get("/subscription/:username", async (req, res) => {
  try {
    let user_name = req.params["username"];
    if (isNULLEMPTYORUNDEFINED(user_name))
      return res.status(400).send({ errorMessage: "Bad request" });
    user_name = userNameFormatter(user_name);
    let client = await pool.connect();
    let userAlreadyExistsRes = await userAlreadyExists(user_name, client);
    if (!userAlreadyExistsRes) {
      return res.status(404).send({ errorMessage: "User not found!" });
    }
    let getUserSubscriptionsQueryRes = await client.query(
      `SELECT US.USER_NAME, US.PLAN_ID, US.START_DATE, 
    PD.VALIDITY FROM USER_SUBSCRIPTIONS US JOIN PLAN_DETAILS PD ON US.PLAN_ID = PD.PLAN_ID WHERE US.USER_NAME = $1 
    ORDER BY US.SUBSCRIBED_ON DESC NULLS LAST`,
      [`${user_name}`]
    );
    client.release();
    if (getUserSubscriptionsQueryRes.rowCount === 0)
      return res.status(200).send([]);
    else {
      getUserSubscriptionsQueryRes = getUserSubscriptionsQueryRes.rows;
      let finalFormattedres = [];
      for (let i = 0; i < getUserSubscriptionsQueryRes.length; i++) {
        let { plan_id, start_date, validity } = getUserSubscriptionsQueryRes[i];
        let tempObj = {};
        tempObj.plan_id = plan_id;
        tempObj.start_date = getISTTimeWithoutHMS(start_date);
        tempObj.valid_till = formatPlanExpiryDate(start_date, validity);
        finalFormattedres.push(tempObj);
      }
      return res.status(200).send(finalFormattedres);
    }
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.get("/subscription/:username/:specifieddate", async (req, res) => {
  try {
    let user_name = req.params["username"];
    let specifieddate = req.params["specifieddate"];
    if (isNULLEMPTYORUNDEFINED(user_name))
      return res.status(400).send({ errorMessage: "Bad request" });
    user_name = userNameFormatter(user_name);
    let client = await pool.connect();
    let userAlreadyExistsRes = await userAlreadyExists(user_name, client);
    if (!userAlreadyExistsRes) {
      return res.status(404).send({ errorMessage: "User not found!" });
    }
    let getsubscriptionDetailsRes = await client.query(
      `SELECT US.START_DATE, US.PLAN_ID,PD.VALIDITY FROM USER_SUBSCRIPTIONS US JOIN PLAN_DETAILS PD ON US.PLAN_ID = PD.PLAN_ID WHERE US.USER_NAME = $1 
      ORDER BY US.SUBSCRIBED_ON DESC NULLS LAST LIMIT 1`,
      [`${user_name}`]
    );
    client.release();
    getsubscriptionDetailsRes = getsubscriptionDetailsRes.rows || [];
    if (getsubscriptionDetailsRes.length > 0) {
      let { plan_id, validity, start_date } = getsubscriptionDetailsRes[0];
      if (validity !== -1) {
        let expiryDate = getISTTimeWithoutHMS(start_date);
        expiryDate = formatPlanExpiryDate(expiryDate, validity);
        let differenceInTime =
          new Date(expiryDate).getTime() - new Date(specifieddate).getTime();
        let days_left = differenceInTime / (1000 * 3600 * 24);
        if (differenceInTime < 0) {
          days_left = 0;
        }
        return res.status(200).send({ plan_id, days_left });
      } else {
        return res.status(200).send({ plan_id, days_left: "" });
      }
    } else {
      return res.status(200).send({});
    }
  } catch (e) {
    return res
      .status(500)
      .send({ errorMessage: "Internal Server Error. " + e.message });
  }
});

app.listen(port, () => {
  console.log("App is listening on port: ", port);
});
