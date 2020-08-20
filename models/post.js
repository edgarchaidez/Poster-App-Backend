const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: { type: String },
    description: { type: String},
    image: { type: String },
    address: { type: String },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User'}
});

module.exports = mongoose.model('Post', postSchema);