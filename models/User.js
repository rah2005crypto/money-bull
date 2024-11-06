import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: String,
  username: String,
  phoneNumber: String,
  password: String
});

export const User = mongoose.model('User', userSchema); 