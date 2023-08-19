const mongoose = require('mongoose');
require('dotenv').config();


mongoose.connect(process.env.MONGO_DB_URL).then(() => {
  console.log('Connected to mongodb')
}).catch(err => console.log('greska je: ', err))
