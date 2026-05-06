const prisma = require('../config/db');

// @desc    Get all expenses
// @route   GET /api/analytics/expenses
// @access  Private/Admin
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new expense
// @route   POST /api/analytics/expenses
// @access  Private/Admin
exports.addExpense = async (req, res) => {
  try {
    const { category, amount, date, description, status } = req.body;
    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        status: status || 'On Budget'
      }
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/analytics/expenses/:id
// @access  Private/Admin
exports.updateExpense = async (req, res) => {
  try {
    const { category, amount, date, description, status } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        category,
        amount: amount ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        description,
        status
      }
    });
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/analytics/expenses/:id
// @access  Private/Admin
exports.deleteExpense = async (req, res) => {
  try {
    await prisma.expense.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
