import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';
import './Cart.css';

function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount } = useCart();

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <div className="empty-cart-content">
          <h2>🛒 Your Cart is Empty</h2>
          <p>Add some amazing products to get started!</p>
          <button className="continue-shopping" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header-section">
          <h1>🛒 Shopping Cart</h1>
          <p className="cart-count">{getCartCount()} items in your cart</p>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="item-details">
                  <h3>{item.productName}</h3>
                  <p className="item-price">₹{item.price.toFixed(2)} each</p>
                  <span className="ai-badge">🤖 AI Optimized Price</span>
                </div>

                <div className="item-actions">
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <p className="total-label">Total</p>
                    <p className="total-price">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            
            <div className="summary-row">
              <span>Subtotal ({getCartCount()} items)</span>
              <span>₹{getCartTotal().toFixed(2)}</span>
            </div>
            
            <div className="summary-row">
              <span>Shipping</span>
              <span className="free-badge">FREE</span>
            </div>
            
            <div className="summary-row">
              <span>Tax (Estimated)</span>
              <span>₹{(getCartTotal() * 0.18).toFixed(2)}</span>
            </div>
            
            <div className="summary-divider"></div>
            
            <div className="summary-row total-row">
              <span>Total</span>
              <span className="final-total">₹{(getCartTotal() * 1.18).toFixed(2)}</span>
            </div>

            <button
              className="checkout-btn"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout →
            </button>

            <button
              className="continue-shopping-link"
              onClick={() => navigate('/')}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
