const { validationResult } = require('express-validator');

const fileHelper = require('../util/file');
const Product = require('../models/product');
const errorHandler = require("../util/errorHandler");

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    hasError: false,
    editing: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage:errors.array()[0].msg,
      validationErrors: errors.array()
    })
  }
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: "Attached file is not an image",
      validationErrors: []
    })
  }
  const imageUrl = "/" + image.path;

  const product = new Product({
    title: title, 
    price: price, 
    description: description, 
    imageUrl: imageUrl, 
    userId: req.user._id
  });
  product.save()
    .then(result => {
      console.log('new product added');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product 
    .findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId) 
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('back');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = "/" + image.path;
      }
      return product.save()
        .then(result => {
          console.log('updated product');
          res.redirect('/admin/products');
        })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate("userId")
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      })
    })
    .catch(err => {
      console.log(err);
      errorHandler(err, next);
    })
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(prod => {
      if (!prod) {
        return next(new Error("Product not found"));
      }
      fileHelper.deleteFile(prod.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id })
    }) 
    .then(result => {
      console.log('product deleted');
      res.status(200).json({ message: "Success" });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ message: "Deleting product failed" });
    })
};
