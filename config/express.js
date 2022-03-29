// requiring all the stuff
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrfProtection = require('csurf')();
const flash = require('connect-flash');
const compression = require('compression');
require('dotenv').config();

const multer = require('../middleware/multer');
const logger = require('../util/logger');
const errorController = require('../controllers/error');
const errorHandler = require('../util/errorHandler');
const isAuth = require('../middleware/is-auth');
const shopController = require('../controllers/shop');
const User = require('../models/user');

const app = express();

module.exports = () => {
  const store = new MongoDBStore({
    uri: process.env.MONGODB_URL,
    collection: "sessions"
  });

  // MVC views config
  app.set('view engine', 'ejs');
  app.set('views', 'views');

  // require routes
  const adminRoutes = require('../routes/admin');
  const shopRoutes = require('../routes/shop');
  const authRoutes = require('../routes/auth');

  // some default express middleware config
  app.use(express.static('public'));
  app.use("/images", express.static('images'));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(multer);
  app.use(compression());
  app.use(logger('combined'));

  // using express-session with mongodbStore
  app.use(
    session({
      secret: "my secret",
      resave: false,
      saveUninitialized: false,
      store: store
    })
  );

  // flash middleware
  app.use(flash());

  // providing req.isAuthenticated variable
  app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
  })

  // providing user data to req
  app.use((req, res, next) => {
    if (!req.session.user) {
      return next();
    };
    User.findById(req.session.user._id)
      .then(user => {
        if (!user) { 
          return next();
        }
        req.user = user;
        next();
      })
      .catch(err => {
        console.log(err);
        errorHandler(err, next);
      })
  })

  app.post('/create-order', isAuth, shopController.postOrder);

  // csrf protection middleware
  app.use(csrfProtection);
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  })

  // apply routes
  app.use('/admin', adminRoutes);
  app.use(shopRoutes);
  app.use(authRoutes);

  // 500 & 404 routes
  app.get('/500', errorController.get500)
  app.use(errorController.get404);

  // global error handling
  app.use((error, req, res, next) => {
    console.log(error)
    res.status(500).render('500', {
      pageTitle: 'Server error', 
      path: '/500',
      isAuthenticated: req.session.isLoggedIn
    });
  })

  return app;
}