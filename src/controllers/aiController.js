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
const generateMockResponse = (user, income, expenses, loans, userMessage) => {
  const currency = user.currency || '$';
  const name = user.username;
  const goal = user.financialGoal;
  const target = user.monthlyLoanTarget;
  
  const totalIncome = income?.totalIncome || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = totalIncome - totalExpenses;

  const activeDebt = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);
  const activeLent = loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + l.amount, 0);

  const msgLower = userMessage.toLowerCase();

  if (msgLower.includes('loan') || msgLower.includes('debt') || msgLower.includes('owe') || goal === 'debt-free') {
    if (activeDebt > 0) {
      const timeLineStr = target > 0 
        ? `If you dedicate your target payoff budget of ${currency}${target}/month, you can clear this in about ${Math.ceil(activeDebt / target)} months.`
        : remaining > 0 
          ? `At your current savings surplus of ${currency}${remaining.toLocaleString()}/month, you can be debt-free in about ${Math.ceil(activeDebt / remaining)} months.`
          : 'Currently, your monthly budget is negative or zero, meaning you do not have spare cash. Try cutting down some variable expenses to create a repayment buffer.';

      return `Hello ${name}! I see you have an active debt of ${currency}${activeDebt.toLocaleString()} you want to overcome. ${timeLineStr}\n\nI recommend using the **Debt Snowball method** (paying off the smallest loan first to build psychological momentum) or the **Debt Avalanche method** (focusing on the highest interest rate debt first to save money). Since your goal is to be debt-free, make this your primary focus before allocating funds to stock market investments!`;
    }
    return `Hi ${name}! You currently have no outstanding debts recorded in your loan ledger. That's a great position to be in! You can focus on building your wealth or high-yield savings. If you decide to lend money in the future, be sure to log it so we can keep track of who owes you.`;
  }

  if (msgLower.includes('invest') || msgLower.includes('stock') || msgLower.includes('save') || goal === 'investing') {
    if (remaining > 0) {
      const rate = Math.round((remaining / totalIncome) * 100);
      return `Hi ${name}! You are saving ${currency}${remaining.toLocaleString()} this month, which is a solid ${rate}% savings rate! Since your goal is ${goal === 'investing' ? 'Investing' : 'Savings'}, I recommend building a 3-month emergency fund first in a High-Yield Savings Account. Once that is set, look into index funds (like S&P 500 tracking ETFs) for passive long-term compounding.`;
    }
    return `Hello ${name}. Currently, your budget is at a deficit of ${currency}${Math.abs(remaining).toLocaleString()} (Income: ${currency}${totalIncome.toLocaleString()}, Expenses: ${currency}${totalExpenses.toLocaleString()}). Before starting an investment plan, we need to bring your cash flow positive. Review your variable expenses this week to see where we can save!`;
  }

  // General fallback response
  return `Hi ${name}, I am your Hishab AI Financial Coach! I've analyzed your logs for ${getCurrentMonth()}:\n\n- **Income**: ${currency}${totalIncome.toLocaleString()}\n- **Expenses**: ${currency}${totalExpenses.toLocaleString()}\n- **Remaining Balance**: ${currency}${remaining.toLocaleString()}\n- **Active Debt Owed**: ${currency}${activeDebt.toLocaleString()}\n\nWhat would you like to achieve today? Ask me about debt payoff strategies, saving tips, or how to allocate your monthly remaining cash! *(Note: Connect an OpenRouter API Key in your backend .env file to enable full conversational intelligence!)*`;
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
      const income = await Income.findOne({ userId: req.user.id, month: currentMonth });
      const expenses = await Expense.find({ userId: req.user.id, month: currentMonth });
      const loans = await Loan.find({ userId: req.user.id, isSettled: false });
      const mockReply = generateMockResponse(user, income, expenses, loans, message);
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
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
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
      replyText = responseData.choices?.[0]?.message?.content || 'I am sorry, I am unable to analyze that right now.';
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
    return res.status(200).json({
      title: randomMerchant,
      amount: randomAmount,
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

    const prompt = `You are a professional receipt scanner tool. Read this receipt image and extract the merchant/store name and the total final charge amount. Return ONLY a raw JSON block matching this exact structure:
{
  "title": "Name of the merchant",
  "amount": 25.50
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

    let parsedData = { title: 'Receipt Entry', amount: 0 };
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
          max_tokens: 500,
          temperature: 0.7,
        })
      });

      if (!apiResponse.ok) {
        throw new Error('OpenRouter API returned error ' + apiResponse.status);
      }

      const responseData = await apiResponse.json();
      replyText = responseData.choices?.[0]?.message?.content || '[]';
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
