'use client';
// import '../Styles/DashboardHome.scss';
import React from 'react';
import { FaSun, FaMoon, FaBell, FaDownload, FaPlus } from 'react-icons/fa';

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-topbar">
        <h2>Hi, Welcome Back</h2>
        <div className="actions">
          <button className="btn download"><FaDownload /> Download</button>
          {/* <button className="btn add"><FaPlus /> Add Dashlist</button> */}
         
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <h4>Total Earning</h4>
          <h2>$22,800.50</h2>
        </div>
        <div className="stat-card">
          <h4>Total losse</h4>
          <h2>$1,096.00</h2>
        </div>
        <div className="stat-card">
          <h4>Total User</h4>
          <h2>78.93%</h2>
        </div>
        <div className="stat-card">
          <h4>Total Amount this Month</h4>
          <h2>$2,200.00</h2>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="dashboard-content">
        {/* Overall Sales */}
        <div className="sales-card">
          <div className="card-header">
            <h4>Overall Sales</h4>
            <span>Sept 07 - Sept 12</span>
          </div>
          <h2>$80,842.52</h2>
          <div className="bar-chart">
            <div className="bar" style={{ height: '40%' }}></div>
            <div className="bar active" style={{ height: '90%' }}></div>
            <div className="bar" style={{ height: '55%' }}></div>
            <div className="bar" style={{ height: '65%' }}></div>
            <div className="bar" style={{ height: '45%' }}></div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="earning-card">
          <div className="card-header">
            <h4>Total Earnings</h4>
            <span>Month</span>
          </div>
          <div className="donut-chart">
            <div className="donut"></div>
            <div className="center-text">
              <h3>88%</h3>
              <p>Earnings</p>
            </div>
          </div>
          <ul>
            <li><span className="color server"></span> Server - 58%</li>
            <li><span className="color website"></span> Website - 24%</li>
            <li><span className="color others"></span> Others - 6%</li>
          </ul>
        </div>
      </div>

      {/* Invoices & Activity */}
      <div className="bottom-section">
        <div className="invoice-card">
          <h4>New Winner</h4>
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Invoice Name</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INV-012-3456789</td>
                <td>Mailchimp Support</td>
                <td>28-12-22</td>
                <td>$320.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
              <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
               <tr>
                <td>INV-024-3456789</td>
                <td>Cash Withdrawal Bank</td>
                <td>24-12-22</td>
                <td>$249.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="activity-card">
          <h4>Recent User</h4>
          <ul>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Haruno" />
              <div>
                <h5>Haruno Sakura</h5>
                <p>15 minutes ago</p>
              </div>
              <span>INV-024-3426789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
             <li>
              <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Yamanaka" />
              <div>
                <h5>Yamanaka Ino</h5>
                <p>1 hour ago</p>
              </div>
              <span>INV-012-3456789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
            <li>
              <img src="https://randomuser.me/api/portraits/men/33.jpg" alt="Uchiha" />
              <div>
                <h5>Uchiha Itachi</h5>
                <p>Just now</p>
              </div>
              <span>INV-054-2856789</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
