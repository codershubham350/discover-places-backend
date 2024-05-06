// const API_KEY= ''

const axios = require('axios');
const HttpError = require('../models/http-error');

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://nominatim.openstreetmap.org/?addressdetails=1&q=${encodeURIComponent(
      address
    )}&format=json&limit=1`
  );

  const data = response.data;

  if (!data) {
    throw new HttpError(
      'Could not get coordinates, for provided location',
      422
    );
  }

  const coordinates = {
    lat: data[0].lat,
    lng: data[0].lon,
  };

  return coordinates;
}

module.exports = getCoordsForAddress;
