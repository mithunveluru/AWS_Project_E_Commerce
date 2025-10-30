import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Eye, 
  Package, RefreshCw, Activity 
} from 'lucide-react';
import { config } from './config';
import './Dashboard.css';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({
    totalRevenue: 0,
    avgPrice: 0,
    totalDemand: 0,
    productCount: 0
  });
  const [priceHistory, setPriceHistory] = useState({});

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${config.apiGatewayUrl}/products`);
      const productData = response.data.products;
      
      setProducts(productData);
      calculateStats(productData);
      updatePriceHistory(productData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (productData) => {
    const totalRevenue = productData.reduce((sum, p) => sum + (parseFloat(p.price) * parseFloat(p.demandScore)), 0);
    const avgPrice = productData.reduce((sum, p) => sum + parseFloat(p.price), 0) / productData.length;
    const totalDemand = productData.reduce((sum, p) => sum + parseFloat(p.demandScore), 0);
    
    setStats({
      totalRevenue: totalRevenue.toFixed(0),
      avgPrice: avgPrice.toFixed(0),
      totalDemand: totalDemand.toFixed(0),
      productCount: productData.length
    });
  };

  // FIXED: Update price history for trending (immutable array operations)
  const updatePriceHistory = (productData) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    setPriceHistory(prev => {
      const newHistory = {};
      
      productData.forEach(product => {
        const productId = product.productId;
        const existingHistory = prev[productId] || [];
        
        // Create new array with existing data plus new point
        const updatedHistory = [
          ...existingHistory,
          {
            time: timestamp,
            price: parseFloat(product.price),
            demand: parseFloat(product.demandScore)
          }
        ];
        
        // Keep only last 10 data points (slice creates new array)
        newHistory[productId] = updatedHistory.slice(-10);
      });
      
      return newHistory;
    });
  };

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, config.refreshInterval);
    return () => clearInterval(interval);
  }, []);

  // Calculate price change
  const getPriceChange = (productId) => {
    const history = priceHistory[productId];
    if (!history || history.length < 2) return 0;
    const first = history[0].price;
    const last = history[history.length - 1].price;
    return ((last - first) / first * 100).toFixed(1);
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D', '#8DD1E1', '#D084D0'];

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spinner" size={48} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📊 E-Commerce Admin Dashboard</h1>
          <p className="subtitle">Real-Time Product & Price Monitoring</p>
        </div>
        <div className="header-right">
          <div className="last-update">
            <Activity size={16} />
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <button className="refresh-btn" onClick={fetchProducts}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">
            <DollarSign size={32} />
          </div>
          <div className="stat-content">
            <h3>Total Revenue Potential</h3>
            <p className="stat-value">₹{stats.totalRevenue}</p>
            <span className="stat-label">Price × Demand</span>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <TrendingUp size={32} />
          </div>
          <div className="stat-content">
            <h3>Average Price</h3>
            <p className="stat-value">₹{stats.avgPrice}</p>
            <span className="stat-label">Across all products</span>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <Eye size={32} />
          </div>
          <div className="stat-content">
            <h3>Total Demand</h3>
            <p className="stat-value">{stats.totalDemand}</p>
            <span className="stat-label">Combined views</span>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">
            <Package size={32} />
          </div>
          <div className="stat-content">
            <h3>Products</h3>
            <p className="stat-value">{stats.productCount}</p>
            <span className="stat-label">Active listings</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Price Distribution Chart */}
        <div className="chart-card">
          <h3>Price Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={products}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                formatter={(value) => `₹${value}`}
              />
              <Legend />
              <Bar dataKey="price" fill="#667eea" name="Current Price" />
              <Bar dataKey="competitorPrice" fill="#f56565" name="Competitor Price" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Demand Distribution Chart */}
        <div className="chart-card">
          <h3>Demand Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={products}
                dataKey="demandScore"
                nameKey="productName"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.productName.substring(0, 15)}...`}
              >
                {products.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} views`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-card">
        <h3>📦 Product Details & Live Pricing</h3>
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>Current Price</th>
                <th>Competitor</th>
                <th>Margin</th>
                <th>Demand</th>
                <th>Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => {
                const margin = ((parseFloat(product.price) - parseFloat(product.competitorPrice)) / parseFloat(product.competitorPrice) * 100).toFixed(1);
                const priceChange = getPriceChange(product.productId);
                const isProfit = margin > 0;
                const isPriceUp = priceChange > 0;
                
                return (
                  <tr key={product.productId} className="table-row">
                    <td><span className="product-id">{product.productId}</span></td>
                    <td className="product-name">
                      <strong>{product.productName}</strong>
                    </td>
                    <td className="price-cell">
                      <span className="price">₹{parseFloat(product.price).toFixed(0)}</span>
                    </td>
                    <td className="competitor-price">
                      ₹{parseFloat(product.competitorPrice).toFixed(0)}
                    </td>
                    <td className={margin > 0 ? 'positive' : 'negative'}>
                      {isProfit ? '+' : ''}{margin}%
                    </td>
                    <td className="demand-cell">
                      <div className="demand-badge">
                        <Eye size={14} />
                        {parseFloat(product.demandScore).toFixed(0)}
                      </div>
                    </td>
                    <td className={priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : ''}>
                      {isPriceUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {priceChange}%
                    </td>
                    <td>
                      <span className={`status-badge ${isProfit ? 'profit' : 'loss'}`}>
                        {isProfit ? 'Profit' : 'Undercut'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Trends Chart */}
      <div className="chart-card full-width">
        <h3>📈 Price Trends (Last 10 Updates)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            {products.slice(0, 5).map((product, index) => {
              const history = priceHistory[product.productId] || [];
              return (
                <Line
                  key={product.productId}
                  type="monotone"
                  data={history}
                  dataKey="price"
                  name={product.productName}
                  stroke={COLORS[index]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;

