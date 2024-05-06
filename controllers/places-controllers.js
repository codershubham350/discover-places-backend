const fs = require('fs');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId); // 'findById()' mongoose specific method.
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Error ❌ Could not find a place for the provided id.',
      404
    );
    return next(error);
  }

  res.json({
    responseMessage: 'Successfully fetched place!',
    place: place.toObject({ getters: true }), // 'toObject()' Converts this document into a plain-old JavaScript object (POJO). Where '{ getters: true }' will apply all getters (path and virtual getters) which will add 'id' property whenever we are converting our document to old javascript object
  });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  //let places;
  let userWithPlaces;
  try {
    //places = await Place.find({ creator: userId }); // 'find()' mongoose specific method
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed. Please try again later',
      500
    );
    return next(error);
  }

  // if (!places || places.length === 0) {
  if (!userWithPlaces || userWithPlaces.length === 0) {
    return next(
      new HttpError(
        'Error ❌ Could not find places for the provided user id.',
        404
      )
    );
  }

  res.status(200).json({
    responseMessage: 'Successfully fetched user specific places!',
    // places: places.map((place) => place.toObject({ getters: true })),
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req); // checks validation errors defined for routes using this function

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid input passed, please check your data.', 422)
    ); // with 'async' functions use 'next()' instead of 'throw'
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData?.userId,
  });

  let user;

  try {
    user = await User.findById(req.userData?.userId);
  } catch (err) {
    const error = new HttpError('Creating place failed, please try again', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  console.log('user', user);

  try {
    const createSession = await mongoose.startSession();
    // below this once session completes its execution only then the data will be saved in mongoDB
    createSession.startTransaction(); // initiates the 'session'
    await createdPlace.save({ session: createSession }); // 'save()' data in mongodb, it's an mongoose property
    user.places.push(createdPlace); // 'user' model will add places referring to user who created the place
    await user.save({ session: createSession }); // saves the data with respect to the session
    await createSession.commitTransaction(); // saves data during the 'session' execution
  } catch (err) {
    const error = new HttpError(
      'Creating place failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({
    responseMessage: 'Data added successfully!',
    place: createdPlace,
  });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req); // checks validation errors defined for routes using this function

  if (!errors.isEmpty()) {
    // throw new HttpError('Invalid input passed, please check your data.', 422); // while NOT using async-await we can explicitly throw error
    return next(
      new HttpError('Invalid input passed, please check your data.', 422)
    ); // while USING async-await we can return next(error)
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
    console.log('place', place);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place',
      500
    );
    return next(error);
  }

  if (place?.creator.toString() !== req.userData?.userId) {
    const error = new HttpError(
      'You are not allowed to update this place',
      401
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place',
      500
    );
    return next(error);
  }

  res.status(200).json({
    responseMessage: 'Data updated successfully!',
    place: place.toObject({ getters: true }),
  });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator'); // populate() method will only work when you have a relation between two tables here we have relation between 'places' and 'users' document where 'creator field is utilizing the 'places' id in 'user' document so we will refer field with populate('creator')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Could not find place associated with this id',
      404
    );
    return next(error);
  }

  if (place.creator?.id !== req.userData?.userId) {
    const error = new HttpError(
      'You are not allowed to delete this place',
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const createSession = await mongoose.startSession();
    createSession.startTransaction();
    await place.deleteOne({ session: createSession });
    place.creator.places.pull(place); // remove place 'id' by using 'pull()' method
    await place.creator.save({ session: createSession });
    await createSession.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ responseMessage: 'Data removed successfully!' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

// return res.status(404).json({
//   message: 'Error ❌ Could not find a place for the provided user id.',
// });
// const error = new Error(

// );
// error.code = 404;
