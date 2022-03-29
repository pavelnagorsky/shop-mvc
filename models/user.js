const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  // name: {
  //   type: String,
  //   required: true
  // },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [{ 
      productId: {
        type: ObjectId,
        ref: "Product",
        required: true
      }, 
      quantity: {
        type: Number, 
        required: true
      }
    }]
  }
});

userSchema.methods.addToCart = function(prodId) {
  // поиск индекса товара в массиве корзины по равенству id 
  const cartProductIndex = this.cart.items.findIndex(cp => {
    return cp.productId.toString() === prodId.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];
  // если товар уже есть в карте - увеличиваем его кол-во
  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: prodId,
      quantity: newQuantity
    });
  }
  const updatedCart = {
    items: updatedCartItems
  };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.removeFromCart = function(productId) {
  const updatedCartItems = this.cart.items.filter(item => {
    return item.productId !== null && item.productId.toString() !== productId.toString();
  });
  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.clearCart = function() {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model('User', userSchema);