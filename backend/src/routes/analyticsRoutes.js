const express = require('express');
const { getRevenueAnalytics } = require('../controllers/analyticsController');
const { getExpenses, addExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/revenue', protect, admin, getRevenueAnalytics);

// Expense CRUD
router.get('/expenses', protect, admin, getExpenses);
router.post('/expenses', protect, admin, addExpense);
router.put('/expenses/:id', protect, admin, updateExpense);
router.delete('/expenses/:id', protect, admin, deleteExpense);

module.exports = router;
