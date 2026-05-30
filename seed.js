const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Income = require('./src/models/Income');
const Expense = require('./src/models/Expense');
const Loan = require('./src/models/Loan');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to Database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hishab');
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Income.deleteMany();
    await Expense.deleteMany();
    await Loan.deleteMany();
    console.log('Existing collections cleared.');

    // 1. Create Default User
    const user = new User({
      username: 'Premium User',
      email: 'user@example.com',
      password: 'password123', // Will be hashed via pre-save hook
    });
    await user.save();
    console.log('✓ Default user created: user@example.com / password123');

    const userId = user._id;

    // Months
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    // Get last month
    let lastMonthYr = d.getFullYear();
    let lastMonthVal = d.getMonth(); // 0-indexed is current month - 1
    if (lastMonthVal === 0) {
      lastMonthVal = 12;
      lastMonthYr -= 1;
    }
    const lastMonth = `${lastMonthYr}-${String(lastMonthVal).padStart(2, '0')}`;

    // 2. Create Incomes
    const incomeCurrent = new Income({
      userId,
      month: currentMonth,
      sources: [
        { sourceName: 'Salary', amount: 5500 },
        { sourceName: 'Freelance Design', amount: 1200 },
        { sourceName: 'Dividends', amount: 150 }
      ]
    });
    await incomeCurrent.save();

    const incomeLast = new Income({
      userId,
      month: lastMonth,
      sources: [
        { sourceName: 'Salary', amount: 5500 },
        { sourceName: 'Freelance Design', amount: 800 }
      ]
    });
    await incomeLast.save();
    console.log('✓ Mock income records seeded.');

    // 3. Create Expenses
    const currentExpenses = [
      { userId, month: currentMonth, title: 'House Rent', amount: 1600, isFixed: true, isCompleted: true },
      { userId, month: currentMonth, title: 'Groceries', amount: 450, isFixed: false, isCompleted: true },
      { userId, month: currentMonth, title: 'Streaming Bundle', amount: 45, isFixed: true, isCompleted: false },
      { userId, month: currentMonth, title: 'Gym Membership', amount: 60, isFixed: true, isCompleted: true },
      { userId, month: currentMonth, title: 'Electricity Bill', amount: 140, isFixed: false, isCompleted: false },
      { userId, month: currentMonth, title: 'Dining Out', amount: 220, isFixed: false, isCompleted: true },
    ];
    await Expense.insertMany(currentExpenses);

    const lastExpenses = [
      { userId, month: lastMonth, title: 'House Rent', amount: 1600, isFixed: true, isCompleted: true },
      { userId, month: lastMonth, title: 'Groceries', amount: 480, isFixed: false, isCompleted: true },
      { userId, month: lastMonth, title: 'Streaming Bundle', amount: 45, isFixed: true, isCompleted: true },
      { userId, month: lastMonth, title: 'Gym Membership', amount: 60, isFixed: true, isCompleted: true },
      { userId, month: lastMonth, title: 'Electricity Bill', amount: 155, isFixed: false, isCompleted: true },
      { userId, month: lastMonth, title: 'Dining Out', amount: 350, isFixed: false, isCompleted: true },
      { userId, month: lastMonth, title: 'Flight Tickets', amount: 600, isFixed: false, isCompleted: true },
    ];
    await Expense.insertMany(lastExpenses);
    console.log('✓ Mock expense records seeded.');

    // 4. Create Loans
    const loans = [
      { userId, borrowerName: 'John Doe', amount: 300, type: 'lent', isSettled: false, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { userId, borrowerName: 'Sarah Jenkins', amount: 150, type: 'borrowed', isSettled: false, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { userId, borrowerName: 'Michael Brown', amount: 50, type: 'lent', isSettled: true, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), settledDate: new Date() },
    ];
    await Loan.insertMany(loans);
    console.log('✓ Mock loan history seeded.');

    console.log('\n=== Seeding Finished Successfully! ===');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
