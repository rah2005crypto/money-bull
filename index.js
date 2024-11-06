import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';
import {User} from './models/User.js';
import bcrypt from 'bcrypt';

const app = express();

// Set up Express middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // Check if user exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName
        });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    successRedirect: '/secrets'
  })
);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Routes
app.get('/', isAuthenticated, (req, res) => {
  res.render('home', { 
    user: {
      fullName: req.user.fullName || req.user.username || 'User',
      // Add other user properties you need
    }
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/secrets', isAuthenticated, (req, res) => {
  res.render('secrets');
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.post("/register", async (req, res) => {
  try {
    const newUser = new User({
      fullName: req.body.fullName,
      username: req.body.username,  // This is the email field from your form
      phoneNumber: req.body.phoneNumber,
      password: req.body.password
    });

    await newUser.save();
    res.redirect("/login");  // Redirect to login page after successful registration
  } catch (err) {
    console.error(err);
    res.redirect("/register");  // Redirect back to register page if there's an error
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username: username });

    if (foundUser) {
      if (foundUser.password === password) {
        // Set up the user session
        req.login(foundUser, (err) => {
          if (err) {
            console.error(err);
            return res.redirect('/login');
          }
          return res.redirect('/');
        });
      } else {
        res.send("<script>alert('Incorrect password!'); window.location.href='/login';</script>");
      }
    } else {
      res.send("<script>alert('User not found! Please register.'); window.location.href='/register';</script>");
    }

  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});

// Feature routes
app.get('/live-charts', isAuthenticated, (req, res) => {
  res.render('live-charts', { user: req.user });
});

app.get('/portfolio', isAuthenticated, (req, res) => {
  res.render('portfolio', { user: req.user });
});

app.get('/option-chain', isAuthenticated, (req, res) => {
  res.render('option-chain', { user: req.user });
});

app.get('/news', isAuthenticated, (req, res) => {
  res.render('news', { user: req.user });
});

app.get('/screener', isAuthenticated, (req, res) => {
  res.render('screener', { user: req.user });
});

app.get('/learn', isAuthenticated, (req, res) => {
  res.render('learning-center', { user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
