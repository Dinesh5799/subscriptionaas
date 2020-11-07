const dotenv = require("dotenv");
dotenv.config();
module.exports = {
  port: process.env.PORT,
  dbUser: process.env.DB_USER,
  dbHost: process.env.DB_HOST,
  dbHmac: process.env.DB_HMAC,
  dbPort: process.env.DB_PORT,
  database: process.env.DATABASE,
  paymentsEndpoint: process.env.PAYMENTS_ENDPOINT,
};
