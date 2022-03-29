// config files
const database = require('./config/database');

// starting express app
const app = require('./config/express')();

// starting server
const serv = async () => {
  try {
    //database init
    await database();
    console.log('database connected');
    // run server
    app.listen(process.env.PORT);
    console.log("server started on port", process.env.PORT);
  } catch (err) {
    err => console.log(err)
  }
};

serv();