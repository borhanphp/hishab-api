const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');

// Helper to get current month (YYYY-MM)
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Generate a rule-based mock response if no API key is set
const generateMockResponse = (user, allIncomes, allExpenses, loans, userMessage) => {
  const currency = user.currency || '$';
  const name = user.username;
  const goal = user.financialGoal;
  const target = user.monthlyLoanTarget;
  const msgLower = userMessage.toLowerCase();

  // 1. Group incomes and expenses by month
  const financialDataByMonth = {};
  
  allIncomes.forEach(inc => {
    if (!financialDataByMonth[inc.month]) {
      financialDataByMonth[inc.month] = { income: 0, sources: [], expenses: [] };
    }
    financialDataByMonth[inc.month].income = inc.totalIncome;
    financialDataByMonth[inc.month].sources = inc.sources || [];
  });

  allExpenses.forEach(exp => {
    if (!financialDataByMonth[exp.month]) {
      financialDataByMonth[exp.month] = { income: 0, sources: [], expenses: [] };
    }
    financialDataByMonth[exp.month].expenses.push(exp);
  });

  // Calculate stats for current month (default)
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentData = financialDataByMonth[currentMonth] || { income: 0, sources: [], expenses: [] };
  const currentIncome = currentData.income;
  const currentExpenses = currentData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const currentRemaining = currentIncome - currentExpenses;

  // Calculate active loan summaries
  const activeBorrowedList = loans.filter(l => !l.isSettled && l.type === 'borrowed');
  const activeLentList = loans.filter(l => !l.isSettled && l.type === 'lent');
  
  const totalBorrowed = activeBorrowedList.reduce((sum, l) => sum + l.amount, 0);
  const totalBorrowedPaid = activeBorrowedList.reduce((sum, l) => {
    const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
    return sum + paid;
  }, 0);
  const remainingBorrowed = totalBorrowed - totalBorrowedPaid;

  const totalLent = activeLentList.reduce((sum, l) => sum + l.amount, 0);
  const totalLentPaid = activeLentList.reduce((sum, l) => {
    const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
    return sum + paid;
  }, 0);
  const remainingLent = totalLent - totalLentPaid;

  // Helper to format months nicely, e.g. "2026-05" -> "May 2026"
  const formatMonthName = (monthStr) => {
    const [year, m] = monthStr.split('-');
    const date = new Date(year, parseInt(m) - 1, 1);
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  };

  // Check 1: User asks for a specific month (e.g. "May", "June", "2026-05")
  const monthsKeys = Object.keys(financialDataByMonth);
  const monthMatch = monthsKeys.find(m => msgLower.includes(m.toLowerCase()) || msgLower.includes(formatMonthName(m).toLowerCase()));
  if (monthMatch) {
    const mData = financialDataByMonth[monthMatch];
    const totalExp = mData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const net = mData.income - totalExp;
    
    // Category summary for that month
    const catMap = {};
    mData.expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const highestCat = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];

    return `Sure ${name}, looking at your record for **${formatMonthName(monthMatch)}**:\n\n` +
      `- **Total Income**: ${currency}${mData.income.toLocaleString()} (${mData.sources.length} sources)\n` +
      `- **Total Expenses**: ${currency}${totalExp.toLocaleString()} (${mData.expenses.length} logs)\n` +
      `- **Net Savings**: ${currency}${net.toLocaleString()} (${mData.income > 0 ? Math.round((net / mData.income) * 100) : 0}% savings rate)\n` +
      (highestCat ? `- **Top Expense Category**: ${highestCat} (${currency}${catMap[highestCat].toLocaleString()})\n\n` : '\n') +
      `Your cash flow for this month was ${net >= 0 ? 'positive, which is great!' : 'negative. Try reviewing the logs to balance your future accounts.'}`;
  }

  // Check 2: User asks about active loans, debt, or who owes whom
  if (msgLower.includes('loan') || msgLower.includes('debt') || msgLower.includes('owe') || msgLower.includes('borrow') || msgLower.includes('lend') || msgLower.includes('pay')) {
    let reply = `Here is your current active loans breakdown, ${name}:\n\n`;
    
    if (activeBorrowedList.length > 0) {
      reply += `**Debts you owe others (Total remaining: ${currency}${remainingBorrowed.toLocaleString()}):**\n`;
      activeBorrowedList.forEach(l => {
        const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
        reply += `- **${l.borrowerName}**: You borrowed ${currency}${l.amount.toLocaleString()} (Paid: ${currency}${paid.toLocaleString()}, Remaining: ${currency}${(l.amount - paid).toLocaleString()})\n`;
      });
    } else {
      reply += `✓ You currently have no outstanding debts owed to others.\n`;
    }
    
    reply += `\n`;

    if (activeLentList.length > 0) {
      reply += `**Money owed to you by contacts (Total remaining: ${currency}${remainingLent.toLocaleString()}):**\n`;
      activeLentList.forEach(l => {
        const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
        reply += `- **${l.borrowerName}**: You lent them ${currency}${l.amount.toLocaleString()} (Collected: ${currency}${paid.toLocaleString()}, Remaining: ${currency}${(l.amount - paid).toLocaleString()})\n`;
      });
    } else {
      reply += `✓ No contacts currently owe you money.\n`;
    }

    if (remainingBorrowed > 0) {
      const timeLine = target > 0 
        ? `With your target payoff rate of **${currency}${target}/month**, you should be completely debt-free in about **${Math.ceil(remainingBorrowed / target)} months**.`
        : currentRemaining > 0 
          ? `Based on your current month's remaining cash of **${currency}${currentRemaining.toLocaleString()}/month**, you can clear this in about **${Math.ceil(remainingBorrowed / currentRemaining)} months**.`
          : `Since you don't have active monthly savings, consider defining a Monthly Loan Payoff budget in Settings to structure your path to becoming debt-free.`;
      reply += `\n🎯 **Repayment Plan**: ${timeLine}`;
    }

    return reply;
  }

  // Check 3: User asks about spending categories or where their money goes
  if (msgLower.includes('category') || msgLower.includes('categories') || msgLower.includes('spend') || msgLower.includes('spent') || msgLower.includes('expense') || msgLower.includes('expenses')) {
    if (currentData.expenses.length === 0) {
      return `Hi ${name}, you haven't logged any expenses for the current month (${formatMonthName(currentMonth)}) yet. Please add your daily expenses to see a categorized breakdown!`;
    }

    const catMap = {};
    currentData.expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    const sortedCats = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);
    let breakdown = `Here is your spending category breakdown for **${formatMonthName(currentMonth)}**:\n\n`;
    sortedCats.forEach(cat => {
      const pct = currentExpenses > 0 ? Math.round((catMap[cat] / currentExpenses) * 100) : 0;
      breakdown += `- **${cat}**: ${currency}${catMap[cat].toLocaleString()} (${pct}%)\n`;
    });

    const fixedExpenses = currentData.expenses.filter(e => e.isFixed);
    const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    breakdown += `\nYour **fixed expenses** (bills, rent, etc.) make up ${currency}${fixedTotal.toLocaleString()} (${currentExpenses > 0 ? Math.round((fixedTotal / currentExpenses) * 100) : 0}% of total spending). The rest is variable. Try cutting down on the highest categories next week!`;
    
    return breakdown;
  }

  // Check 4: User asks for savings tips, advice, or goals
  if (msgLower.includes('tip') || msgLower.includes('save') || msgLower.includes('budget') || msgLower.includes('advice') || msgLower.includes('invest') || msgLower.includes('plan')) {
    if (currentRemaining > 0) {
      const rate = Math.round((currentRemaining / currentIncome) * 100);
      let strategyTip = '';
      if (goal === 'savings') {
        strategyTip = `Since your primary goal is **Savings**, focus on building a solid 3 to 6-month emergency buffer in a secure high-yield account before investing in riskier assets.`;
      } else if (goal === 'investing') {
        strategyTip = `With your goal set to **Investing**, once you have a small emergency buffer, look into long-term dollar-cost averaging (DCA) into broad-market index funds (like S&P 500 ETFs) to harness compounding.`;
      } else if (goal === 'debt-free') {
        strategyTip = `Since your goal is to be **Debt-Free**, allocate this surplus of ${currency}${currentRemaining.toLocaleString()} to clear your remaining debts of ${currency}${remainingBorrowed.toLocaleString()} rather than investing it.`;
      } else {
        strategyTip = `With a balanced strategy, you can split your remaining balance 50/50 between liquid cash savings and long-term investments.`;
      }

      return `Hi ${name}! You are currently saving **${currency}${currentRemaining.toLocaleString()}** (a **${rate}%** savings rate) from your monthly income of ${currency}${currentIncome.toLocaleString()}.\n\n💡 **AI Advice**: ${strategyTip}\n\nTo increase this rate, review your top variable categories and try setting a monthly budget constraint on the dashboard.`;
    } else {
      const deficit = Math.abs(currentRemaining);
      return `Hello ${name}. Currently, your budget is at a deficit of **${currency}${deficit.toLocaleString()}** this month (Income: ${currency}${currentIncome.toLocaleString()}, Expenses: ${currency}${currentExpenses.toLocaleString()}).\n\n⚠️ **Action Plan**: Before creating any investment or savings plan, we need to balance your cash flow. Review your variable expenses this week to see where you can trim costs by at least ${currency}${deficit.toLocaleString()} to break even.`;
    }
  }

  // General Status Overview (Fallback)
  const rate = currentIncome > 0 ? Math.round((currentRemaining / currentIncome) * 100) : 0;
  return `Hi ${name}! I've analyzed your financial logs and here is your status for **${formatMonthName(currentMonth)}**:\n\n` +
    `- **Total Income**: ${currency}${currentIncome.toLocaleString()}\n` +
    `- **Total Expenses**: ${currency}${currentExpenses.toLocaleString()}\n` +
    `- **Monthly Savings**: ${currency}${currentRemaining.toLocaleString()} (${rate}% savings rate)\n` +
    `- **Outstanding Debts**: ${currency}${remainingBorrowed.toLocaleString()}\n` +
    `- **Money Owed to You**: ${currency}${remainingLent.toLocaleString()}\n\n` +
    `Ask me details about your **budget**, specific **months** (e.g., "May 2026"), **loans/debts**, or **category breakdowns** to get customized analysis!`;
};

// @desc    Generate AI coaching chat response
// @route   POST /api/ai/chat
// @access  Private
const getAICoachResponse = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const currentMonth = getCurrentMonth();
    
    // Fetch context data
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free';
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Check if we have a valid key (either OpenRouter or Gemini)
    const hasOpenRouter = openrouterApiKey && openrouterApiKey !== 'your_openrouter_api_key_here';
    const hasGemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here';

    // If no API key is configured, fallback to rule-based mock advisor
    if (!hasOpenRouter && !hasGemini) {
      const allIncomes = await Income.find({ userId: req.user.id }).sort({ month: -1 });
      const allExpenses = await Expense.find({ userId: req.user.id }).sort({ month: -1 });
      const loans = await Loan.find({ userId: req.user.id });
      const mockReply = generateMockResponse(user, allIncomes, allExpenses, loans, message);
      return res.status(200).json({ reply: mockReply });
    }

    // Fetch user-specific financial records (strictly scoped to req.user.id)
    const allIncomes = await Income.find({ userId: req.user.id }).sort({ month: -1 });
    const allExpenses = await Expense.find({ userId: req.user.id }).sort({ month: -1 });
    const loans = await Loan.find({ userId: req.user.id, isSettled: false });

    // Prepare system prompts and context details
    const currency = user.currency || '$';
    
    const activeDebtList = loans.filter(l => l.type === 'borrowed').map(l => `${l.borrowerName}: ${currency}${l.amount}`).join(', ');
    const activeOwedList = loans.filter(l => l.type === 'lent').map(l => `${l.borrowerName}: ${currency}${l.amount}`).join(', ');

    // Group incomes and expenses by month
    const financialDataByMonth = {};

    allIncomes.forEach(inc => {
      if (!financialDataByMonth[inc.month]) {
        financialDataByMonth[inc.month] = { income: 0, sources: [], expenses: [] };
      }
      financialDataByMonth[inc.month].income = inc.totalIncome;
      financialDataByMonth[inc.month].sources = inc.sources.map(s => `${s.sourceName}: ${currency}${s.amount}`);
    });

    allExpenses.forEach(exp => {
      if (!financialDataByMonth[exp.month]) {
        financialDataByMonth[exp.month] = { income: 0, sources: [], expenses: [] };
      }
      financialDataByMonth[exp.month].expenses.push(
        `${exp.title}: ${currency}${exp.amount} [Category: ${exp.category}, Fixed: ${exp.isFixed}, Paid: ${exp.isCompleted}]`
      );
    });

    let monthlyBreakdownStr = '';
    const months = Object.keys(financialDataByMonth).sort().reverse();
    if (months.length === 0) {
      monthlyBreakdownStr = 'No income or expense records found.';
    } else {
      months.forEach(m => {
        const data = financialDataByMonth[m];
        const totalExp = allExpenses.filter(e => e.month === m).reduce((sum, e) => sum + e.amount, 0);
        const net = data.income - totalExp;
        monthlyBreakdownStr += `\n### Month: ${m}\n`;
        monthlyBreakdownStr += `- Total Income: ${currency}${data.income} (Sources: ${data.sources.join(', ') || 'None'})\n`;
        monthlyBreakdownStr += `- Total Expenses: ${currency}${totalExp} (List: ${data.expenses.join(', ') || 'None'})\n`;
        monthlyBreakdownStr += `- Net Remaining: ${currency}${net}\n`;
      });
    }

    const systemPrompt = `You are Hishab AI, a premium personal finance coach. The user's name is ${user.username}, their currency is ${currency}, their goal is ${user.financialGoal}, and their monthly loan target payoff is ${currency}${user.monthlyLoanTarget}.

Here is their full historical financial status by month:
${monthlyBreakdownStr}

Active Loans (Who they owe money to): ${activeDebtList || 'None'}
Active Loans (Who owes them money): ${activeOwedList || 'None'}

Provide highly realistic, motivating, and actionable advice to the user. Address them by name and use their currency symbol (${currency}) for all financial numbers.
When the user asks about a specific month (e.g. "June 2026" or "last month"), refer to the corresponding month's data in the history.
Limit your response to 2-3 short, crisp paragraphs. Be direct, and offer concrete tips on their budget or loan payoff timeline. Do not use Markdown headings like # or ## in the final output (but you can use bold text for key terms).`;

    let replyText = '';

    if (hasOpenRouter) {
      const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://github.com/hishab',
          'X-Title': 'Hishab Personal Finance Coach',
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            {
              role: 'user',
              content: `Instructions: You are Hishab AI, a premium personal finance coach. Address the user directly, offer concrete tips, and do not repeat these instructions or output planning thoughts.\n\n${systemPrompt}\n\nUser Message: "${message}"\n\nResponse as Hishab AI (speak directly to the user now):`
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          reasoning: {
            exclude: true
          }
        })
      });

      if (!apiResponse.ok) {
        const errBody = await apiResponse.json().catch(() => ({}));
        console.error('OpenRouter API Error:', errBody);
        const errorMessage = errBody.error?.message || apiResponse.statusText || 'Unknown error';
        return res.status(200).json({
          reply: `⚠️ **OpenRouter API Error**: ${errorMessage}\n\nPlease check your OpenRouter API key, credit balance, or model availability.`
        });
      }

      const responseData = await apiResponse.json();
      let content = responseData.choices?.[0]?.message?.content || '';
      if (content.includes('<think>')) {
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }
      replyText = content || 'I am sorry, I am unable to analyze that right now.';
    } else {
      // Fallback to Gemini
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const apiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\nUser message: "${message}"`
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        })
      });

      if (!apiResponse.ok) {
        const errBody = await apiResponse.json().catch(() => ({}));
        console.error('Gemini API Error:', errBody);
        const errorMessage = errBody.error?.message || apiResponse.statusText || 'Unknown error';
        return res.status(200).json({
          reply: `⚠️ **Gemini API Error**: ${errorMessage}\n\nPlease check your Gemini API key configuration.`
        });
      }

      const responseData = await apiResponse.json();
      replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'I am sorry, I am unable to analyze that right now.';
    }
    
    res.status(200).json({ reply: replyText });

  } catch (error) {
    res.status(500).json({ message: `Internal Server Error: ${error.message}` });
  }
};

// @desc    Scan receipt image and return merchant and amount details
// @route   POST /api/ai/scan
// @access  Private
const scanReceiptImage = async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ message: 'Image base64 data is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback to mock scanner if no Gemini API Key is configured
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const merchants = ['Walmart Store', 'McDonalds', 'Gas Station', 'Uber Ride', 'Coffee Shop'];
    const randomMerchant = merchants[Math.floor(Math.random() * merchants.length)];
    const randomAmount = parseFloat((Math.random() * 45 + 5).toFixed(2));
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    const catMap = {
      'Walmart Store': 'Shopping',
      'McDonalds': 'Food',
      'Gas Station': 'Transport',
      'Uber Ride': 'Transport',
      'Coffee Shop': 'Food'
    };

    return res.status(200).json({
      title: randomMerchant,
      amount: randomAmount,
      category: catMap[randomMerchant] || 'Other',
      date: currentMonth,
      isMock: true,
    });
  }

  try {
    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      const match = parts[0].match(/data:(.*)/);
      if (match) mimeType = match[1];
      cleanBase64 = parts[1];
    }

    const prompt = `You are a professional receipt scanner tool. Read this receipt image and extract the merchant/store name, the total final charge amount, and classify the expense into one of these categories: ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other']. Return ONLY a raw JSON block matching this exact structure:
{
  "title": "Name of the merchant",
  "amount": 25.50,
  "category": "Food"
}
Do not enclose the JSON inside markdown code blocks (like \`\`\`json). Just return the raw JSON string. If you cannot read the merchant name or total, make a best guess. Keep the title short (2-3 words).`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      throw new Error('Gemini API returned error code ' + apiResponse.status);
    }

    const responseData = await apiResponse.json();
    const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedData = { title: 'Receipt Entry', amount: 0, category: 'Other' };
    try {
      let cleanText = replyText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      parsedData = JSON.parse(cleanText);
    } catch (err) {
      console.error('Failed to parse Gemini output:', replyText);
    }

    res.status(200).json({
      title: parsedData.title || 'Receipt Entry',
      amount: parsedData.amount || 0,
      category: parsedData.category || 'Other',
      date: new Date().toISOString().substring(0, 7),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAICoachTips = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free';
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Check if we have a valid key (either OpenRouter or Gemini)
    const hasOpenRouter = openrouterApiKey && openrouterApiKey !== 'your_openrouter_api_key_here';
    const hasGemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here';

    // If no API key is configured, fallback to empty array (the frontend will automatically fallback to client-side suggestions)
    if (!hasOpenRouter && !hasGemini) {
      return res.status(200).json({ tips: [] });
    }

    // Fetch user-specific financial records (strictly scoped to req.user.id)
    const allIncomes = await Income.find({ userId: req.user.id }).sort({ month: -1 });
    const allExpenses = await Expense.find({ userId: req.user.id }).sort({ month: -1 });
    const loans = await Loan.find({ userId: req.user.id, isSettled: false });

    // Prepare system prompts and context details
    const currency = user.currency || '$';
    
    const activeDebtList = loans.filter(l => l.type === 'borrowed').map(l => `${l.borrowerName}: ${currency}${l.amount}`).join(', ');
    const activeOwedList = loans.filter(l => l.type === 'lent').map(l => `${l.borrowerName}: ${currency}${l.amount}`).join(', ');

    // Group incomes and expenses by month
    const financialDataByMonth = {};

    allIncomes.forEach(inc => {
      if (!financialDataByMonth[inc.month]) {
        financialDataByMonth[inc.month] = { income: 0, sources: [], expenses: [] };
      }
      financialDataByMonth[inc.month].income = inc.totalIncome;
      financialDataByMonth[inc.month].sources = inc.sources.map(s => `${s.sourceName}: ${currency}${s.amount}`);
    });

    allExpenses.forEach(exp => {
      if (!financialDataByMonth[exp.month]) {
        financialDataByMonth[exp.month] = { income: 0, sources: [], expenses: [] };
      }
      financialDataByMonth[exp.month].expenses.push(
        `${exp.title}: ${currency}${exp.amount} [Category: ${exp.category}, Fixed: ${exp.isFixed}, Paid: ${exp.isCompleted}]`
      );
    });

    let monthlyBreakdownStr = '';
    const months = Object.keys(financialDataByMonth).sort().reverse();
    if (months.length === 0) {
      monthlyBreakdownStr = 'No income or expense records found.';
    } else {
      months.forEach(m => {
        const data = financialDataByMonth[m];
        const totalExp = allExpenses.filter(e => e.month === m).reduce((sum, e) => sum + e.amount, 0);
        const net = data.income - totalExp;
        monthlyBreakdownStr += `\n### Month: ${m}\n`;
        monthlyBreakdownStr += `- Total Income: ${currency}${data.income} (Sources: ${data.sources.join(', ') || 'None'})\n`;
        monthlyBreakdownStr += `- Total Expenses: ${currency}${totalExp} (List: ${data.expenses.join(', ') || 'None'})\n`;
        monthlyBreakdownStr += `- Net Remaining: ${currency}${net}\n`;
      });
    }

    const prompt = `You are Hishab AI, a premium personal finance coach. Based on the user's profile and financial history, generate exactly 4 to 6 highly personalized, actionable financial tips, alerts, or budgeting recommendations.
The user's name is ${user.username}, their currency is ${currency}, their goal is ${user.financialGoal}, and their monthly loan target payoff is ${currency}${user.monthlyLoanTarget}.
Here is their full historical financial status by month:
${monthlyBreakdownStr}

Active Loans (Who they owe money to): ${activeDebtList || 'None'}
Active Owed to Them (Who owes them money): ${activeOwedList || 'None'}

Return ONLY a raw JSON array matching this exact structure:
[
  "First financial tip starting with an appropriate emoji...",
  "Second financial tip starting with an appropriate emoji...",
  "Third financial tip starting with an appropriate emoji..."
]
Do not enclose the JSON inside markdown code blocks (like \`\`\`json). Just return the raw JSON array string.
Keep each tip short, crisp, and direct (max 2 sentences). Use the user's currency symbol (${currency}) for all financial numbers.`;

    let replyText = '';

    if (hasOpenRouter) {
      const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://github.com/hishab',
          'X-Title': 'Hishab Personal Finance Coach',
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          reasoning: {
            exclude: true
          }
        })
      });

      if (!apiResponse.ok) {
        throw new Error('OpenRouter API returned error ' + apiResponse.status);
      }

      const responseData = await apiResponse.json();
      let content = responseData.choices?.[0]?.message?.content || '[]';
      if (content.includes('<think>')) {
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }
      replyText = content;
    } else {
      // Fallback to Gemini
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const apiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        })
      });

      if (!apiResponse.ok) {
        throw new Error('Gemini API returned error ' + apiResponse.status);
      }

      const responseData = await apiResponse.json();
      replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    }

    let parsedTips = [];
    try {
      let cleanText = replyText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      parsedTips = JSON.parse(cleanText);
    } catch (err) {
      console.error('Failed to parse AI tips output:', replyText);
      parsedTips = [];
    }

    res.status(200).json({ tips: parsedTips });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAICoachResponse,
  scanReceiptImage,
  getAICoachTips,
};
