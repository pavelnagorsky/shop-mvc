const path = require('path');
const stripe = require('stripe')(process.env.STRYPE_TEST);

const pdfInvoice = require("../util/pdfInvoice");
const Product = require('../models/product');
const Order = require('../models/order');
const errorHandler = require('../util/errorHandler');
const getPagination = require('../util/pagination');

exports.getProducts = (req, res, next) => {
  const ITEMS_PER_PAGE = +process.env.PER_PAGE || 2;
  const page = +req.query.page || 1;
  let totalItems;
  Product
    .find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find() 
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .sort({ createdAt: -1 })
    })
    .then(products => {
      let pagination = getPagination(ITEMS_PER_PAGE, page, totalItems);
      res.render('shop/product-list', {
        prods: products,
        pagination: pagination,
        pageTitle: 'Shop',
        path: '/products'
      });
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(
      product => {
        res.render('shop/product-detail', {
          product: product,
          pageTitle: product.title,
          path: '/products',
        })
      }
    )
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getIndex = (req, res, next) => {
  const ITEMS_PER_PAGE = +process.env.PER_PAGE || 2;
  const page = +req.query.page || 1;
  let totalItems;
  Product
    .find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .sort({ createdAt: -1 })
    })
    .then(products => {
      let pagination = getPagination(ITEMS_PER_PAGE, page, totalItems);
      res.render('shop/index', {
        prods: products,
        pagination: pagination,
        pageTitle: 'Shop',
        path: '/'
      });
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then(user => {
      const deletedProdIds = [];
      // если админ удаляет продукт, который висит у пользователя в корзине,
      // то эти продукты удаляются из массива на рендер и корзины в бд
      const cartProducts = user.cart.items.filter(item => {
        if ( item.productId === null) {
          deletedProdIds.push(item._id);
        }
        return item.productId !== null
      });
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: cartProducts,
      });
      // удаляем из корзины в бд несуществующие продукты
      deletedProdIds.forEach(prodId => {
        return user.removeFromCart(prodId);
      })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

// добавление продукта в корзину пользователя
exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.addToCart(prodId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(() => res.redirect('/cart'))
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then(user => {
      const cartProducts = user.cart.items;
      let total = 0;
      cartProducts.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: cartProducts,
        totalSum: total
      });
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}

exports.postOrder = (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; 
  let totalSum = 0;

  req.user
    .populate("cart.items.productId")
    .then(user => {
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
      });
      const cartProducts = req.user.cart.items.map(prod => {
        return {
          product: { ...prod.productId._doc },
          quantity: prod.quantity
        }
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user._id
        },
        products: cartProducts
      });
      return order.save()
    })
    .then(result => { 
      const charge = stripe.charges.create({
        amount: totalSum * 100,
        currency: 'usd',
        description: 'Demo Order',
        source: token,
        metadata: { order_id: result._id.toString() }
      });
      return req.user.clearCart(); 
    })
    .then(result => res.redirect('/orders'))
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      // если заказ найден и принадлежит текущему юзеру
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join('data', 'invoices', invoiceName);
      // const PdfDoc = new PDFdocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `inline; filename="${invoiceName}"`
      );
      // создание и отправка pdf отчета
      pdfInvoice(invoicePath, res, order);
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
}
