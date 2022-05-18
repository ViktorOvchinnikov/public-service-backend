const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const withAuth = require('./middleware');
const cors = require('cors');
const Invoice = require('./models/Invoice');

const app = express();

app.use(cors());

const secret = 'mysecretsshhh';

//db secret db:JZd5nOWBYvfjShZh

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

const mongo_uri = 'mongodb+srv://db:JZd5nOWBYvfjShZh@cluster0.blexr.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err) {
  if (err) {
    throw err;
  } else {
    console.log(`Successfully connected to ${mongo_uri}`);
  }
});

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/home', function(req, res) {
  res.send('Welcome!');
});

app.get('/api/secret', withAuth, function(req, res) {
  res.send('The password is potato');
});

app.post('/api/register', function(req, res) {
  const { email, password, firstName, lastName, address } = req.body;
  const user = new User({
    email: email,
    password: password,
    firstname: firstName,
    lastname: lastName,
    address: address,
    role: 'user',
  });
  user.save(function(err) {
    if (err) {
      console.log(err);
      res.status(500).send("Error registering new user please try again.");
    } else {
      res.status(200).send("Welcome to the club!");
    }
  });
});

app.post('/api/authenticate', function(req, res) {
  const { email, password } = req.body;
  User.findOne({ email }, function(err, user) {
    if (err) {
      console.error(err);
      res.status(500)
        .json({
        error: 'Internal error please try again'
      });
    } else if (!user) {
      res.status(401)
        .json({
        error: 'Incorrect email or password'
      });
    } else {
      user.isCorrectPassword(password, function(err, same) {
        if (err) {
          res.status(500)
            .json({
            error: 'Internal error please try again'
          });
        } else if (!same) {
          res.status(401)
            .json({
            error: 'Incorrect email or password'
          });
        } else {
          // Issue token
          const payload = {
            email: email,
            role: user.role,
            lastname: user.lastname,
            firstname: user.firstname,
            address: user.address,
          };
          const token = jwt.sign(payload, secret, {
            expiresIn: '1h'
          });
          res
          .cookie('token', token, { httpOnly: true })
          .set({
            "x-token": token,
            "Access-Control-Expose-Headers": "x-token",
          })
          .status(200)
          .json({
            user: {
              address: user.address,
              firstName: user.firstname,
              lastName: user.lastname,
              role: user.role,
            }
          });
        }
      });
    }
  });
});

app.get('/checkToken', withAuth, function(req, res) {
  res.sendStatus(200);
});

app.post('/api/invoices', withAuth, function(req, res) {
  const {email, type, address, value} = req.body;
  const invoice = new Invoice({
    email: email,
    type: type,
    address: address,
    value: value,
    firstname: req.firstname,
    lastname: req.lastname,
  });
  invoice.save((err) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error creating new bill please try again.");
    } else {
      res.status(200).send("Creation complete.");
    }
  })
});

app.get('/api/invoices', withAuth, function(req, res) {
  if (req.role === 'admin') {
    Invoice.find({}, (err, items) => {
      if (err) {
        return res.status(500).send('Error finding invoices.');
      }
      res.status(200).json(items);
    });
  } else {
    Invoice.find({email: req.email}, (err, items) => {
      if (err) {
        return res.status(500).send('Error finding invoices.');
      }
      res.status(200).json(items);
    });
  }
});

app.listen(process.env.PORT || 8080);