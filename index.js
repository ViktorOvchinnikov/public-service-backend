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
const Rate = require('./models/Rate');

const app = express();

app.use(cors());

const secret = 'mysecretsshhh';

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
  const rate = new Rate({
    gas: 7.25,
    water: 25,
    
  })
  res.send('Welcome!');
  
});

app.post('/api/rates', withAuth, (req, res) => {
  if (req.role !== 'admin') return res.sendStatus(403);

  const {latinName, cyrillicName, price} = req.body;
  const rate = new Rate({latinName, cyrillicName, price});
  rate.save((err) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error creating new rate.");
    } else {
      res.status(200).send("Creating successful");
    }
  })
});

app.put('/api/rates', withAuth, async (req, res) => {
  if (req.role !== 'admin') return res.sendStatus(403);

  const rates = req.body.rates;

  let dbPromises = rates.map((rate) => {
    return new Promise((resolve) => {
      Rate.findOneAndUpdate({latinName: rate.latinName}, {price: rate.price})
      .then(() => resolve())
      .catch((err) => {
        console.log(err);
        return res.status(500).json({error: err});
      });
    })
  })

  Promise.all(dbPromises)
    .then(() => {
      Rate.find({})
        .then((items) => res.status(200).json({rates: items}))
        .catch((err) => {
          console.log(err);
          res.status(500).json({error: err});
        });
    })
});

app.get('/api/rates', withAuth, (req, res) => {
  Rate.find({})
    .then((items) => res.status(200).json({rates: items}))
    .catch((err) => {
      console.log(err);
      res.status(500).json({error: err});
    });
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
            expiresIn: '100h'
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

app.get('/api/pastValues', withAuth, function (req, res) {

  const water = Invoice.findOne({email: req.email, type: 'Вода'}, {}, { sort: { 'created_at' : -1} })
    .then((item) => item)
  const gas = Invoice.findOne({email: req.email, type: 'Газ'}, {}, { sort: { 'created_at' : -1} })
    .then((item) => item);
  const electricity = Invoice.findOne({email: req.email, type: 'Электричество'}, {}, { sort: { 'created_at' : -1} })
    .then((item) => item);

  Promise.all([water, gas, electricity])
    .then((values) => {
      res.status(200).json({values: {
        "Вода": values[0].value,
        "Газ": values[1].value,
        "Электричество": values[2].value,
      }});
    }) 
})

app.post('/api/invoices', withAuth, function(req, res) {
  const invoices = req.body.invoices;
  const result = [];

  for (const invoice of invoices) {
    result.push({
      email: req.email,
      address: req.address,
      firstname: req.firstname,
      lastname: req.lastname,
      type: invoice.type,
      value: invoice.value,
      cost: invoice.cost,
    });
  }

  Invoice.insertMany(result)
    .then(() => res.status(200).send("Creation complete."))
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error creating new bills please try again.");
    });
});

app.get('/api/invoices', withAuth, function(req, res) {
  if (req.role === 'admin') {
    Invoice.find({}).sort('-created_at').exec((err, items) => {
      if (err) {
        return res.status(500).send('Error finding invoices.');
      }
      res.status(200).json(items);
    });
  } else {
    Invoice.find({email: req.email}).sort('-created_at').exec((err, items) => {
      if (err) {
        return res.status(500).send('Error finding invoices.');
      }
      res.status(200).json(items);
    });
  }
});

app.listen(process.env.PORT || 8080);