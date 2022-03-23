const { PG_CONNECTION_OBJ } = require("../../../util/config");

const { Pool } = require("pg");

const pool = new Pool(PG_CONNECTION_OBJ);

const testConnection = async () => {
  try {
    const query = await pool.query("select 1");
    console.log("db connection successful! Response: ", query.rows);
  } catch (error) {
    console.log("db connection unsuccessful", error);
  }
};

testConnection();

module.exports = {
  query: (text, params) => pool.query(text, params),
};
