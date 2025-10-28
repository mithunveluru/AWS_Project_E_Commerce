import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { config } from './config';
import { signIn, signUp, signOut, getCurrentUser } from './auth';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    checkUser();
    fetchProducts();
    const interval = setInterval(fetchProducts, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkUser = async () => {
    try {
      const session = await getCurrentUser();
      setUser(session);
    } catch (err) {
      setUser(null);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiGatewayUrl}/products`);
      setProducts(response.data.products);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trackProductView = async (productId) => {
    try {
      await axios.post(`${config.apiGatewayUrl}/track`, {
        productId: productId
      });
      fetchProducts();
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUp(email, password);
        alert('Sign up successful! Please sign in.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        await checkUser();
        setShowAuth(false);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  const addToCart = (product, e) => {
    e.stopPropagation();
    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.productId);
      if (existing) {
        return prevCart.map(item =>
          item.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'add-to-cart-alert';
    toast.textContent = `✓ ${product.productName} added to cart!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
    
    trackProductView(product.productId);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🛒 Smart E-Commerce Store</h1>
          <p className="subtitle">Powered by AI-Driven Dynamic Pricing</p>
        </div>

        <div className="header-actions">
          <div className="cart-icon-btn">
            🛒 Cart
            {getCartCount() > 0 && (
              <span className="cart-badge">{getCartCount()}</span>
            )}
          </div>

          <div className="auth-section">
            {user ? (
              <button onClick={handleSignOut} className="auth-button">
                Sign Out
              </button>
            ) : (
              <button onClick={() => setShowAuth(!showAuth)} className="auth-button">
                {showAuth ? 'Close' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && !user && (
        <div className="auth-modal">
          <form onSubmit={handleAuth}>
            <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">{isSignUp ? 'Sign Up' : 'Sign In'}</button>
            <p onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth">
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </p>
          </form>
        </div>
      )}

      <main className="products-section">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div
                key={product.productId}
                className="product-card"
                onClick={() => trackProductView(product.productId)}
              >
                <div className="product-header">
                  <h3>{product.productName}</h3>
                  <span className="demand-badge">
                    🔥 {product.demandScore} views
                  </span>
                </div>
                <div className="price-section">
                  <div className="current-price">₹{parseFloat(product.price).toFixed(2)}</div>
                  <div className="competitor-price">
                    Competitor: ₹{parseFloat(product.competitorPrice).toFixed(2)}
                  </div>
                </div>
                <div className="product-footer">
                  <button 
                    className="buy-button"
                    onClick={(e) => addToCart(product, e)}
                  >
                    Add to Cart
                  </button>
                  <span className="dynamic-label">🤖 AI Optimized</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Prices update automatically every minute based on demand & competition</p>
        <p className="free-tier-badge">✨ 100% AWS Free Tier</p>
      </footer>
    </div>
  );
}

export default App;

