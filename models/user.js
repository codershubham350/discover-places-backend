const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  places: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Place', // will refer to 'Place' model and set a relation with places and users schema
    },
  ], // one user can have multiple places, one-to-many relationship so storing places data in an Array
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
