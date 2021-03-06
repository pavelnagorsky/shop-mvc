const bcrypt = require('bcryptjs');
const Crypto = require('crypto');
const { validationResult } = require('express-validator');

const mailer = require('../util/mailer');
const errorHandler = require('../util/errorHandler');
const User = require('../models/user');

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    pageTitle: 'Login',
    path: '/login',
    errorMessage: message,
    oldInput: { email: "", password: "" },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: { 
      email: "", 
      password: "", 
      confirmPassword: ""
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: { 
        email: email, 
        password: password
      },
      validationErrors: errors.array()
    });
  };
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: "Invalid Email",
          oldInput: { 
            email: email, 
            password: password
          },
          validationErrors: []
        });
      };
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              res.redirect('/');
            });
          }
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: "Invalid password",
            oldInput: { 
              email: email, 
              password: password
            },
            validationErrors: []
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: { 
        email: email, 
        password: password, 
        confirmPassword: confirmPassword 
      },
      validationErrors: errors.array()
    });
  }
  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      console.log("new user signed up");
      let messageHtml = "<h1>You have successfully signed up</h1>";
      return mailer(email, "Signup succeeded!", messageHtml)
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
}

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

// ???????????????????? ??????????, ???????? ?????????????????? email ????????????????????, ????
// ?????????????????? ?????????? ?? ?????? expDate ?? ???????????? ???????????????????????? ?? ????
// ???????????????? ???? ?????????????? ???????????????? ?? ???????????????????? ???????????? ?? ?????????????? domain/reset/:token
exports.postReset = (req, res, next) => {
  Crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    const email = req.body.email;
    const tokenLife = 3600000; // ???????? ???????????????? ???????????? ?? ???????????????????????? (1??)
    User.findOne({ email: email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with this email found.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + tokenLife 
        return user.save()
          .then(result => {
            res.redirect('/');
            return mailer(
              email, 
              "Password reset",
              `
              <p>You requested a password reset</p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
              `
            )
          })
          // ???????????????????? ?????????????? ???????????????? ???????????? ?????????? ?????????????????? expDate
          .then(result => {
            setTimeout(() => {
              user.resetToken = undefined;
              user.resetTokenExpiration = undefined;
              user.save()
                .then(() => console.log("token expired for: ", user.email))
            }, tokenLife)
          })
    
      })
      .catch(err => {
        console.log(err);
        errorHandler(err, next);
      })
  }) 
}

// ???????? ???????????????????????? ?????????????????? ???? ???????????? ???? ????????????, ?? ?????????????? ??????????
exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  // ?????????????? ?????????? ???? ???????????? ?? ?????????????????? ?????? expDate
  User.findOne({ 
    resetToken: token, 
    resetTokenExpiration: { $gt: Date.now() } 
  })
    .then(user => {
      if (!user) {
        return res.redirect('/');
      }
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      // ?? ?????????????????????????????? ???????????????? ???????????????? ?? ?????????? userId ?? passwordToken
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}

// ???????????????? ???????????? ????????????
exports.postNewPassword = (req, res, next) => {
  // ?????????????????? ???????????? ???? hidden inputs ??????????
  const newPassword = req.body.password;
  if (newPassword.trim().length < 1) {
    req.flash('error', 'Password is required');
    return res.redirect('back');
  }
  // userId ?????? ??????????????????????????, ?????? ?????? ???????????? ?????? ????????????????????????, ?????? ?? 
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  User
    .findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId
    })
    .then(user => {
      if (!user) {
        return res.redirect('/');
      }
      resetUser = user;
      return bcrypt.hash(newPassword, 12)
        .then(hashedPassword => {
          resetUser.password = hashedPassword;
          resetUser.resetToken = undefined;
          resetUser.resetTokenExpiration = undefined;
          return resetUser.save()
        })
        .then(result => {
          console.log("successfully reseted password for: ", resetUser.email);
          res.redirect('/login');
        })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}