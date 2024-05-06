const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const HttpError = require('./models/http-error');
const usersRoutes = require('./routes/users-routes');

const app = express();

app.use(bodyParser.json()); // parses "string" format data to "json format"

// filter requests for images
app.use('/uploads/images', express.static(path.join('uploads', 'images'))); // returns a static file which is requested from uploads/images folder

// CORS header setting
app.use((req, res, next) => {
  // below setHeader('Access-Control-Allow-Origin', '*') is setting the header to avoid the CORS error issue where '*'
  // denotes that it can be accessed from anywhere we can restrict it as well to just setHeader('Access-Control-Allow-Origin' , 'http://localhost:3000/')
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    // multer adds 'file' property in req object
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    }); // deletes file
  }

  if (res.headerSent) {
    return next(error); // it means request went successfully, forward the error for the next step
  }

  res
    .status(error.code || 500)
    .json({ message: error.message || 'An unknown error occurred' });
});
// app.use('/api/users', usersRoutes);

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.x6osand.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    app.listen(5000, () => {
      console.log('App listening on port:: 5000');
    });
  })
  .catch((err) => {
    console.error(err);
  });
