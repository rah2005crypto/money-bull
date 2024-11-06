const express = require('express');
const passport = require('passport');
const User = require('./models/User');
const mongoose = require('mongoose');

const app = express();

mongoose.connect("mongodb+srv://rahul:rahul@cluster0.ccgwm.mongodb.net/", { useNewUrlParser: true, useUnifiedTopology: true });

app.post("/register", function(req, res) {
    const newUser = new User({
        username: req.body.username,
        fullName: req.body.fullName,
        phoneNumber: req.body.phoneNumber
    });

    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets"); // or whatever your protected route is
            });
        }
    });
}); 