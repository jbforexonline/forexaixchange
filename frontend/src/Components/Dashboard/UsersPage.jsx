'use client';
import React, { useState } from 'react';
import '../Styles/User.scss';

export default function Page() {
  const [filter, setFilter] = useState('All');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [invoices, setInvoices] = useState([
    {
      name: 'Robert Fox',
      role: 'Marketing Manager',
      create: '7/11/19',
      due: '3/4/16',
      amount: 10,
      send: 1,
      status: 'New user',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    {
      name: 'Ronald Richards',
      role: 'Medical Assistant',
      create: '5/27/15',
      due: '8/21/15',
      amount: 30,
      send: 3,
      status: 'New User',
      avatar: 'https://randomuser.me/api/portraits/men/40.jpg',
    },
    {
      name: 'Guy Hawkins',
      role: 'Nursing Assistant',
      create: '4/4/18',
      due: '4/4/18',
      amount: 15,
      send: 4,
      status: 'Overdue',
      avatar: 'https://randomuser.me/api/portraits/men/21.jpg',
    },
    {
      name: 'Albert Flores',
      role: 'President of Sales',
      create: '5/7/16',
      due: '12/4/17',
      amount: 24,
      send: 2,
      status: 'Draft',
      avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    },
    {
      name: 'Sarah Johnson',
      role: 'Software Engineer',
      create: '2/15/20',
      due: '3/15/20',
      amount: 45,
      send: 2,
      status: 'Paid',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    {
      name: 'Michael Chen',
      role: 'Data Analyst',
      create: '1/8/21',
      due: '2/8/21',
      amount: 28,
      send: 1,
      status: 'Unpaid',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
    {
      name: 'Emily Davis',
      role: 'UX Designer',
      create: '6/12/20',
      due: '7/12/20',
      amount: 35,
      send: 3,
      status: 'Overdue',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
    {
      name: 'David Wilson',
      role: 'Product Manager',
      create: '9/3/19',
      due: '10/3/19',
      amount: 52,
      send: 4,
      status: 'Paid',
      avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
    },
    {
      name: 'Lisa Anderson',
      role: 'HR Specialist',
      create: '11/20/20',
      due: '12/20/20',
      amount: 18,
      send: 2,
      status: 'Draft',
      avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
    },
    {
      name: 'James Brown',
      role: 'Financial Advisor',
      create: '4/7/21',
      due: '5/7/21',
      amount: 67,
      send: 1,
      status: 'Unpaid',
      avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
    },
    {
      name: 'Maria Garcia',
      role: 'Operations Manager',
      create: '8/14/20',
      due: '9/14/20',
      amount: 41,
      send: 3,
      status: 'Overdue',
      avatar: 'https://randomuser.me/api/portraits/women/50.jpg',
    },
    {
      name: 'Kevin Lee',
      role: 'Business Analyst',
      create: '12/1/19',
      due: '1/1/20',
      amount: 33,
      send: 2,
      status: 'Paid',
      avatar: 'https://randomuser.me/api/portraits/men/28.jpg',
    },
  ]);

  // CRUD Functions
  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setInvoices(invoices.filter((_, i) => i !== index));
    }
  };

  const handleEdit = (user, index) => {
    setEditingUser(index);
    setEditForm({ ...user });
  };

  const handleSaveEdit = () => {
    const updatedInvoices = [...invoices];
    updatedInvoices[editingUser] = editForm;
    setInvoices(updatedInvoices);
    setEditingUser(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleInputChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const filteredInvoices =
    filter === 'All' ? invoices : invoices.filter((inv) => inv.status === filter);

  const stats = {
    Paid: invoices.filter((i) => i.status === 'Paid'),
    Unpaid: invoices.filter((i) => i.status === 'Unpaid'),
    Overdue: invoices.filter((i) => i.status === 'Overdue'),
    Draft: invoices.filter((i) => i.status === 'Draft'),
  };

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Invoices</h1>
        <button
          className="create-btn"
          onClick={() => alert('Create Invoice Clicked!')}
        >
          + Create Invoice
        </button>
      </div>

      <div className="stats">
        {Object.keys(stats).slice(0, 3).map((key) => (
          <div key={key} className={`card ${key.toLowerCase()}`}>
            <div className="card-title">{key}</div>
            <div className="card-info">
              Pies: {stats[key].length} | Value: $
              {stats[key].reduce((a, c) => a + c.amount, 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="filters">
        {['All', 'Paid', 'Unpaid', 'Overdue', 'Draft'].map((f) => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f} ({f === 'All' ? invoices.length : stats[f]?.length || 0})
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Create</th>
            <th>Due</th>
            <th>Amount</th>
            <th>Send</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((inv, idx) => (
            <tr key={idx}>
              <td>
                <div className="client-info">
                  <img src={inv.avatar} alt={inv.name} />
                  <div>
                    {editingUser === idx ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <div className="name">{inv.name}</div>
                    )}
                    {editingUser === idx ? (
                      <input
                        type="text"
                        value={editForm.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <div className="role">{inv.role}</div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                {editingUser === idx ? (
                  <input
                    type="text"
                    value={editForm.create}
                    onChange={(e) => handleInputChange('create', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  inv.create
                )}
              </td>
              <td>
                {editingUser === idx ? (
                  <input
                    type="text"
                    value={editForm.due}
                    onChange={(e) => handleInputChange('due', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  inv.due
                )}
              </td>
              <td>
                {editingUser === idx ? (
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => handleInputChange('amount', parseInt(e.target.value))}
                    className="edit-input"
                  />
                ) : (
                  `$${inv.amount}`
                )}
              </td>
              <td>
                {editingUser === idx ? (
                  <input
                    type="number"
                    value={editForm.send}
                    onChange={(e) => handleInputChange('send', parseInt(e.target.value))}
                    className="edit-input"
                  />
                ) : (
                  inv.send
                )}
              </td>
              <td>
                {editingUser === idx ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="edit-select"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Draft">Draft</option>
                  </select>
                ) : (
                  <span className={`status ${inv.status.toLowerCase()}`}>
                    {inv.status}
                  </span>
                )}
              </td>
              <td>
                <div className="action-buttons">
                  {editingUser === idx ? (
                    <>
                      <button
                        className="save-btn"
                        onClick={handleSaveEdit}
                        title="Save changes"
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={handleCancelEdit}
                        title="Cancel editing"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(inv, idx)}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(idx)}
                        title="Delete user"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
