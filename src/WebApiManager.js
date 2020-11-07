const { paymentsEndpoint } = require("../config");
const Axios = require("axios");
function paymentsPost(data) {
  try {
    let headers = {
      "Content-Type": "application/json",
    };
    return Axios.post(paymentsEndpoint, data, { headers });
  } catch (e) {
    console.error(`Failed to post to payments service: ${e}`);
  }
}

module.exports = { paymentsPost };
