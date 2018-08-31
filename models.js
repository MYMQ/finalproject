const mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  userId: String,
  phone: String,
  channelId:String,
})

var User = mongoose.model('user', userSchema)

export {User}
