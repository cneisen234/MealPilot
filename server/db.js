/* the only line you likely need to change is

 database: 'prime_app',

 change `prime_app` to the name of your database, and you should be all set!
*/

const pg = require("pg");
const url = require("url");

let config = {};

if (process.env.DATABASE_URL) {
  // Heroku gives a url, not a connection object
  // https://github.com/brianc/node-pg-pool
  const params = url.parse(process.env.DATABASE_URL);
  const auth = params.auth.split(":");

  config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split("/")[1],
    ssl: { rejectUnauthorized: false },
    max: 10, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  };
} else {
  config = {
    database: "vibequest", // the name of our database on our server
    host: "localhost", // server name (same as postico)
    port: 5432, // local postgres server port, 5432 is the default
    max: 10, // how many connections to the database? 10 is a good number
    idleTimeoutMillis: 30000, // how long to keep the pool active?
  };
}

// this creates the pool that will be shared by all other modules
const pool = new pg.Pool(config);

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err) => {
  console.log("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = pool;
