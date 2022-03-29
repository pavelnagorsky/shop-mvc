const express = require('express');
const { check, body } = require('express-validator');
const router = express.Router();

const User = require('../models/user');
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');

router.get('/login', authController.getLogin);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address.')
      .normalizeEmail(),
    body('password', 'Password has to be valid.')
      .trim()
      .isLength({ min: 6 })
      .isAlphanumeric()
  ],
  authController.postLogin
);

router.get('/signup', authController.getSignup);

router.post(
  '/signup', 
  // validation
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom(async value => {
        const userDoc = await User.findOne({ email: value })
        if (userDoc) {
          throw new Error("E-Mail already exists");
        } 
        return true;
      })
      .normalizeEmail(),
    body('password', "Invalid passport (min 5 symbols or numbers)")
      .trim()
      .isLength({ min: 6 })
      .isAlphanumeric(),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      })
  ],
  authController.postSignup
);

router.post('/logout', isAuth, authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;