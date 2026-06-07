const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');

// Helper to get current month (YYYY-MM)
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const MOCK_DICTS = {
  en: {
    sure_month: "Sure {name}, looking at your record for **{month}**:",
    total_income: "Total Income",
    total_expenses: "Total Expenses",
    net_savings: "Net Savings",
    sources: "sources",
    logs: "logs",
    savings_rate: "savings rate",
    top_expense_cat: "Top Expense Category",
    cash_flow_positive: "Your cash flow for this month was positive, which is great!",
    cash_flow_negative: "Your cash flow for this month was negative. Try reviewing the logs to balance your future accounts.",
    active_loans_breakdown: "Here is your current active loans breakdown, {name}:",
    debts_owed_title: "Debts you owe others (Total remaining: {amount}):",
    debts_borrowed_item: "- **{borrower}**: You borrowed {amount} (Paid: {paid}, Remaining: {remaining})",
    no_outstanding_debts: "✓ You currently have no outstanding debts owed to others.",
    money_owed_to_you_title: "Money owed to you by contacts (Total remaining: {amount}):",
    debts_lent_item: "- **{borrower}**: You lent them {amount} (Collected: {collected}, Remaining: {remaining})",
    no_contacts_owe: "✓ No contacts currently owe you money.",
    payoff_timeline_target: "With your target payoff rate of **{target}/month**, you should be completely debt-free in about **{months} months**.",
    payoff_timeline_savings: "Based on your current month's remaining cash of **{savings}/month**, you can clear this in about **{months} months**.",
    payoff_timeline_none: "Since you don't have active monthly savings, consider defining a Monthly Loan Payoff budget in Settings to structure your path to becoming debt-free.",
    repayment_plan_title: "Repayment Plan",
    no_expenses_month: "Hi {name}, you haven't logged any expenses for the current month ({month}) yet. Please add your daily expenses to see a categorized breakdown!",
    spending_breakdown_title: "Here is your spending category breakdown for **{month}**:",
    fixed_expenses_summary: "Your **fixed expenses** (bills, rent, etc.) make up {amount} ({pct}% of total spending). The rest is variable. Try cutting down on the highest categories next week!",
    goal_tip_savings: "Since your primary goal is **Savings**, focus on building a solid 3 to 6-month emergency buffer in a secure high-yield account before investing in riskier assets.",
    goal_tip_investing: "With your goal set to **Investing**, once you have a small emergency buffer, look into long-term dollar-cost averaging (DCA) into broad-market index funds (like S&P 500 ETFs) to harness compounding.",
    goal_tip_debt_free: "Since your goal is to be **Debt-Free**, allocate this surplus of {amount} to clear your remaining debts of {remaining} rather than investing it.",
    goal_tip_general: "With a balanced strategy, you can split your remaining balance 50/50 between liquid cash savings and long-term investments.",
    ai_coach_tip_saving: "Hi {name}! You are currently saving **{amount}** (a **{rate}%** savings rate) from your monthly income of {income}.\n\n💡 **AI Advice**: {tip}\n\nTo increase this rate, review your top variable categories and try setting a monthly budget constraint on the dashboard.",
    ai_coach_tip_deficit: "Hello {name}. Currently, your budget is at a deficit of **{amount}** this month (Income: {income}, Expenses: {expenses}).\n\n⚠️ **Action Plan**: Before creating any investment or savings plan, we need to balance your cash flow. Review your variable expenses this week to see where you can trim costs by at least {amount} to break even.",
    fallback_summary_title: "Hi {name}! I've analyzed your financial logs and here is your status for **{month}**:",
    fallback_monthly_savings: "Monthly Savings",
    fallback_outstanding_debts: "Outstanding Debts",
    fallback_money_owed: "Money Owed to You",
    fallback_footer: "Ask me details about your **budget**, specific **months** (e.g., \"May 2026\"), **loans/debts**, or **category breakdowns** to get customized analysis!"
  },
  bn: {
    sure_month: "অবশ্যই {name}, **{month}** এর জন্য আপনার রেকর্ড অনুযায়ী:",
    total_income: "মোট আয়",
    total_expenses: "মোট ব্যয়",
    net_savings: "নিট সঞ্চয়",
    sources: "উৎস",
    logs: "লগ",
    savings_rate: "সঞ্চয়ের হার",
    top_expense_cat: "শীর্ষ ব্যয় বিভাগ",
    cash_flow_positive: "এই মাসে আপনার ক্যাশ ফ্লো ইতিবাচক ছিল, যা অত্যন্ত চমৎকার!",
    cash_flow_negative: "এই মাসে আপনার ক্যাশ ফ্লো নেতিবাচক ছিল। আপনার অ্যাকাউন্ট ব্যালেন্স করতে দয়া করে খরচের লগগুলো পর্যালোচনা করুন।",
    active_loans_breakdown: "এখানে আপনার বর্তমান সক্রিয় ঋণের বিবরণ রয়েছে, {name}:",
    debts_owed_title: "অন্যদের কাছে আপনার ঋণ (মোট বাকি: {amount}):",
    debts_borrowed_item: "- **{borrower}**: আপনি ঋণ নিয়েছেন {amount} (পরিশোধিত: {paid}, বাকি: {remaining})",
    no_outstanding_debts: "✓ আপনার বর্তমানে অন্যদের কাছে কোনো বকেয়া ঋণ নেই।",
    money_owed_to_you_title: "আপনার কাছে অন্যদের ঋণ (মোট বাকি: {amount}):",
    debts_lent_item: "- **{borrower}**: আপনি ঋণ দিয়েছেন {amount} (সংগৃহীত: {collected}, বাকি: {remaining})",
    no_contacts_owe: "✓ বর্তমানে কোনো পরিচিত ব্যক্তি আপনার কাছে ঋণী নেই।",
    payoff_timeline_target: "আপনার লক্ষ্য পরিশোধের হার **{target}/মাস** অনুযায়ী, আপনি প্রায় **{months} মাসের** মধ্যে সম্পূর্ণ ঋণমুক্ত হবেন।",
    payoff_timeline_savings: "আপনার বর্তমান মাসের অবশিষ্ট সঞ্চয় **{savings}/মাস** অনুযায়ী, আপনি প্রায় **{months} মাসের** মধ্যে ঋণ পরিশোধ করতে পারবেন।",
    payoff_timeline_none: "যেহেতু আপনার কোনো সক্রিয় মাসিক সঞ্চয় নেই, তাই ঋণমুক্ত হওয়ার জন্য সেটিংসে একটি মাসিক ঋণ পরিশোধের বাজেট নির্ধারণ করুন।",
    repayment_plan_title: "পরিশোধের পরিকল্পনা",
    no_expenses_month: "হ্যালো {name}, আপনি এখনও চলতি মাসের ({month}) কোনো খরচ লগ করেননি। একটি বিশদ ব্যয় বিবরণ দেখতে আপনার দৈনিক খরচগুলো যুক্ত করুন!",
    spending_breakdown_title: "এখানে **{month}** মাসের জন্য আপনার ব্যয়ের বিবরণী রয়েছে:",
    fixed_expenses_summary: "আপনার **নির্দিষ্ট ব্যয়** (বিল, ভাড়া ইত্যাদি) মোট খরচের {amount} ({pct}%) অংশ। বাকিগুলো পরিবর্তনশীল। আগামী সপ্তাহে সর্বোচ্চ ব্যয়ের বিভাগগুলো কমিয়ে আনার চেষ্টা করুন!",
    goal_tip_savings: "যেহেতু আপনার প্রধান লক্ষ্য **সঞ্চয়**, তাই ঝুঁকিপূর্ণ সম্পদে বিনিয়োগের আগে একটি নিরাপদ উচ্চ-মুনাফা অ্যাকাউন্টে ৩ থেকে ৬ মাসের জরুরি তহবিল গড়ে তোলার দিকে মনোনিবেশ করুন।",
    goal_tip_investing: "আপনার লক্ষ্য **বিনিয়োগ** হওয়ায়, একটি ছোট জরুরি তহবিল তৈরির পর চক্রবৃদ্ধি মুনাফার সুবিধা নিতে প্রতি মাসে নিয়মিত সূচক তহবিले (যেমন S&P 500 index ETF) বিনিয়োগ (DCA) শুরু করুন।",
    goal_tip_debt_free: "যেহেতু আপনার লক্ষ্য **ঋণমুক্ত হওয়া**, তাই বিনিয়োগের বদলে আপনার এই {amount} অতিরিক্ত সঞ্চয়টি বাকি {remaining} ঋণ পরিশোধে ব্যবহার করুন।",
    goal_tip_general: "একটি সুষম পরিকল্পনার সাথে, আপনি আপনার অবশিষ্ট ব্যালেন্সের ৫০% তরল ক্যাশ সঞ্চয় এবং ৫০% দীর্ঘমেয়াদী বিনিয়োগে ভাগ করতে পারেন।",
    ai_coach_tip_saving: "হ্যালো {name}! আপনি বর্তমানে আপনার মাসিক আয় {income} থেকে **{amount}** ({rate}% সঞ্চয় হার) সঞ্চয় করছেন।\n\n💡 **এআই পরামর্শ**: {tip}\n\nএই হার বাড়াতে, আপনার শীর্ষ পরিবর্তনশীল বিভাগগুলো পর্যালোচনা করুন এবং ড্যাশবোর্ডে একটি মাসিক ব্যয়ের বাজেট নির্ধারণ করুন।",
    ai_coach_tip_deficit: "হ্যালো {name}। বর্তমানে আপনার এই মাসের বাজেটে **{amount}** ঘাটতি রয়েছে (আয়: {income}, ব্যয়: {expenses})।\n\n⚠️ **কর্মপরিকল্পনা**: কোনো বিনিয়োগ বা সঞ্চয় শুরুর আগে ক্যাশ ফ্লো সুষম করতে হবে। খরচ সমতায় আনতে এই সপ্তাহে আপনার পরিবর্তনশীল খরচগুলো কমপক্ষে {amount} কমিয়ে আনুন।",
    fallback_summary_title: "হ্যালো {name}! আমি আপনার আর্থিক লগ বিশ্লেষণ করেছি এবং এখানে **{month}** মাসের জন্য আপনার অবস্থা দেওয়া হলো:",
    fallback_monthly_savings: "মাসিক সঞ্চয়",
    fallback_outstanding_debts: "বকেয়া ঋণ",
    fallback_money_owed: "পাওনা টাকা",
    fallback_footer: "আপনার বাজেট, নির্দিষ্ট মাস (যেমন: \"মে ২০২৬\"), ঋণ বা খরচের বিবরণ সম্পর্কে আরও জানতে আমাকে জিজ্ঞাসা করুন!"
  },
  es: {
    sure_month: "Claro {name}, mirando tus registros para **{month}**:",
    total_income: "Ingresos Totales",
    total_expenses: "Gastos Totales",
    net_savings: "Ahorro Neto",
    sources: "fuentes",
    logs: "registros",
    savings_rate: "tasa de ahorro",
    top_expense_cat: "Categoría de Mayor Gasto",
    cash_flow_positive: "¡Tu flujo de caja para este mes fue positivo, lo cual es excelente!",
    cash_flow_negative: "Tu flujo de caja para este mes fue negativo. Revisa tus gastos para equilibrar tus cuentas futuras.",
    active_loans_breakdown: "Aquí está tu desglose de préstamos activos, {name}:",
    debts_owed_title: "Deudas que debes a otros (Total restante: {amount}):",
    debts_borrowed_item: "- **{borrower}**: Prestado {amount} (Pagado: {paid}, Restante: {remaining})",
    no_outstanding_debts: "✓ Actualmente no tienes deudas pendientes con otros.",
    money_owed_to_you_title: "Dinero que te deben tus contactos (Total restante: {amount}):",
    debts_lent_item: "- **{borrower}**: Les prestaste {amount} (Cobrado: {collected}, Restante: {remaining})",
    no_contacts_owe: "✓ Ningún contacto te debe dinero actualmente.",
    payoff_timeline_target: "Con tu tasa de pago objetivo de **{target}/mes**, estarás completamente libre de deudas en aproximadamente **{months} meses**.",
    payoff_timeline_savings: "Basado en tu saldo restante de **{savings}/mes**, puedes saldar esto en aproximadamente **{months} meses**.",
    payoff_timeline_none: "Como no tienes ahorros mensuales activos, considera configurar un presupuesto de pago de préstamos en la Configuración para estructurar tu camino hacia una vida sin deudas.",
    repayment_plan_title: "Plan de Pago",
    no_expenses_month: "Hola {name}, aún no has registrado gastos para el mes actual ({month}). ¡Agrega tus gastos diarios para ver el desglose por categorías!",
    spending_breakdown_title: "Aquí está tu desglose de gastos por categoría para **{month}**:",
    fixed_expenses_summary: "Tus **gastos fijos** (facturas, alquiler, etc.) representan {amount} ({pct}% del gasto total). El resto es variable. ¡Intenta reducir las categorías más altas la próxima semana!",
    goal_tip_savings: "Como tu objetivo principal es el **Ahorro**, enfócate en construir un fondo de emergencia de 3 a 6 meses en una cuenta segura de alto rendimiento antes de invertir en activos de riesgo.",
    goal_tip_investing: "Con tu meta en **Inversiones**, una vez que tengas tu fondo de emergencia, considera invertir mensualmente (DCA) en fondos indexados globales (como ETFs de S&P 500) para aprovechar el interés compuesto.",
    goal_tip_debt_free: "Dado que tu meta es estar **Libre de Deudas**, asigna este excedente de {amount} a pagar tus deudas pendientes de {remaining} en lugar de invertir.",
    goal_tip_general: "Con una estrategia equilibrada, puedes dividir tu saldo restante 50/50 entre ahorros en efectivo líquido e inversiones a largo plazo.",
    ai_coach_tip_saving: "¡Hola {name}! Actualmente estás ahorrando **{amount}** (una tasa de ahorro del {rate}%) de tus ingresos mensuales de {income}.\n\n💡 **Consejo de IA**: {tip}\n\nPara aumentar esta tasa, revisa tus gastos variables y establece un límite de presupuesto mensual.",
    ai_coach_tip_deficit: "Hola {name}. Tu presupuesto tiene un déficit de **{amount}** este mes (Ingresos: {income}, Gastos: {expenses}).\n\n⚠️ **Plan de Acción**: Antes de ahorrar o invertir, debemos equilibrar tu flujo de caja. Intenta reducir tus gastos variables en al menos {amount} esta semana.",
    fallback_summary_title: "¡Hola {name}! Analicé tus registros financieros y aquí está tu estado para **{month}**:",
    fallback_monthly_savings: "Ahorro Mensual",
    fallback_outstanding_debts: "Deudas Pendientes",
    fallback_money_owed: "Dinero que te Deben",
    fallback_footer: "¡Pregúntame detalles sobre tu presupuesto, meses específicos (ej. \"mayo 2026\"), préstamos o categorías de gastos para recibir un análisis personalizado!"
  },
  de: {
    sure_month: "Sicher {name}, hier ist deine Übersicht für **{month}**:",
    total_income: "Gesamteinnahmen",
    total_expenses: "Gesamtausgaben",
    net_savings: "Nettoersparnisse",
    sources: "Quellen",
    logs: "Einträge",
    savings_rate: "Sparquote",
    top_expense_cat: "Größte Ausgabenkategorie",
    cash_flow_positive: "Dein Cashflow für diesen Monat war positiv, das ist großartig!",
    cash_flow_negative: "Dein Cashflow für diesen Monat war negativ. Überprüfe deine Einträge, um deine zukünftigen Konten auszugleichen.",
    active_loans_breakdown: "Hier ist deine Übersicht über aktive Kredite, {name}:",
    debts_owed_title: "Schulden bei anderen (Verbleibend: {amount}):",
    debts_borrowed_item: "- **{borrower}**: Du hast {amount} geliehen (Bezahlt: {paid}, Offen: {remaining})",
    no_outstanding_debts: "✓ Du hast derzeit keine ausstehenden Schulden bei anderen.",
    money_owed_to_you_title: "Geld, das dir andere schulden (Verbleibend: {amount}):",
    debts_lent_item: "- **{borrower}**: Du hast ihnen {amount} geliehen (Eingeholt: {collected}, Offen: {remaining})",
    no_contacts_owe: "✓ Niemand schuldet dir derzeit Geld.",
    payoff_timeline_target: "Mit deiner Ziel-Rückzahlungsrate von **{target}/Monat** bist du in etwa **{months} Monaten** komplett schuldenfrei.",
    payoff_timeline_savings: "Basierend auf deinen Ersparnissen von **{savings}/Monat** kannst du dies in etwa **{months} Monaten** zurückzahlen.",
    payoff_timeline_none: "Da du keine aktiven Ersparnisse hast, erstelle in den Einstellungen ein Rückzahlungsbudget, um schuldenfrei zu werden.",
    repayment_plan_title: "Rückzahlungsplan",
    no_expenses_month: "Hallo {name}, du hast für den aktuellen Monat ({month}) noch keine Ausgaben eingetragen. Trage Ausgaben ein, um ein Diagramm zu sehen!",
    spending_breakdown_title: "Hier ist deine Ausgabenaufteilung für **{month}**:",
    fixed_expenses_summary: "Deine **Fixkosten** (Miete, Rechnungen usw.) machen {amount} ({pct}% der Gesamtausgaben) aus. Der Rest ist variabel. Versuche, die höchsten Kategorien nächste Woche zu reduzieren!",
    goal_tip_savings: "Da dein Hauptziel **Sparen** ist, baue zuerst eine eiserne Reserve für 3-6 Monate auf einem Tagesgeldkonto auf, bevor du riskantere Investments tätigst.",
    goal_tip_investing: "Mit dem Ziel **Investieren** solltest du nach Aufbau der Reserve per Sparplan (DCA) in breit gestreute ETFs (wie S&P 500) investieren, um vom Zinseszins zu profitieren.",
    goal_tip_debt_free: "Da dein Ziel **Schuldenfreiheit** ist, nutze deinen Überschuss von {amount}, um offene Schulden von {remaining} schneller zu tilgen, statt zu investieren.",
    goal_tip_general: "Mit einer ausgewogenen Strategie kannst du deinen Überschuss 50/50 aufteilen: die Hälfte auf das Sparkonto, die andere Hälfte in langfristige Investments.",
    ai_coach_tip_saving: "Hallo {name}! Du sparst derzeit **{amount}** (eine Sparquote von {rate}%) deiner monatlichen Einnahmen von {income}.\n\n💡 **KI-Tipp**: {tip}\n\nUm diese Quote zu erhöhen, reduziere deine variablen Kosten und setze dir ein monatliches Budgetlimit.",
    ai_coach_tip_deficit: "Hallo {name}. Du hast diesen Monat ein Defizit von **{amount}** (Einnahmen: {income}, Ausgaben: {expenses}).\n\n⚠️ **Aktionsplan**: Vor dem Investieren müssen wir deinen Cashflow ausgleichen. Reduziere deine variablen Kosten diese Woche um mindestens {amount}.",
    fallback_summary_title: "Hallo {name}! Ich habe deine Finanzdaten analysiert. Hier ist dein Status für **{month}**:",
    fallback_monthly_savings: "Monatliche Ersparnisse",
    fallback_outstanding_debts: "Ausstehende Schulden",
    fallback_money_owed: "Geld, das dir zusteht",
    fallback_footer: "Frage mich nach Details zu deinem Budget, bestimmten Monaten (z.B. \"Mai 2026\"), Krediten oder Ausgabenkategorien für eine persönliche Analyse!"
  },
  hi: {
    sure_month: "ज़रूर {name}, **{month}** के लिए आपके रिकॉर्ड इस प्रकार हैं:",
    total_income: "कुल आय",
    total_expenses: "कुल खर्च",
    net_savings: "शुद्ध बचत",
    sources: "स्रोत",
    logs: "प्रविष्टियाँ",
    savings_rate: "बचत दर",
    top_expense_cat: "शीर्ष खर्च श्रेणी",
    cash_flow_positive: "इस महीने आपका कैश फ्लो सकारात्मक रहा, जो कि बहुत बढ़िया है!",
    cash_flow_negative: "इस महीने आपका कैश फ्लो नकारात्मक रहा। अपने खातों को संतुलित करने के लिए खर्चों की समीक्षा करें।",
    active_loans_breakdown: "यहाँ आपके सक्रिय ऋणों का विवरण दिया गया है, {name}:",
    debts_owed_title: "दूसरों को देय ऋण (कुल शेष: {amount}):",
    debts_borrowed_item: "- **{borrower}**: आपने {amount} उधार लिए (भुगतान किया: {paid}, शेष: {remaining})",
    no_outstanding_debts: "✓ वर्तमान में दूसरों के प्रति आपका कोई ऋण बकाया नहीं है।",
    money_owed_to_you_title: "उधार दिया पैसा जो आपको वापस मिलना है (कुल शेष: {amount}):",
    debts_lent_item: "- **{borrower}**: आपने उन्हें {amount} उधार दिए (वसूल किया: {collected}, शेष: {remaining})",
    no_contacts_owe: "✓ वर्तमान में किसी भी संपर्क पर आपका पैसा बकाया नहीं है।",
    payoff_timeline_target: "आपके लक्ष्य भुगतान दर **{target}/माह** के अनुसार, आप लगभग **{months} महीनों** में पूरी तरह ऋण-मुक्त हो जाएंगे।",
    payoff_timeline_savings: "आपकी वर्तमान बचत **{savings}/माह** के आधार पर, आप इसे लगभग **{months} महीनों** में चुका सकते हैं।",
    payoff_timeline_none: "चूंकि आपकी कोई सक्रिय बचत नहीं है, ऋण-मुक्त होने के लिए सेटिंग्स में मासिक ऋण भुगतान बजट निर्धारित करने पर विचार करें।",
    repayment_plan_title: "भुगतान योजना",
    no_expenses_month: "नमस्ते {name}, आपने चालू माह ({month}) के लिए कोई खर्च दर्ज नहीं किया है। श्रेणीवार विवरण देखने के लिए अपने दैनिक खर्च जोड़ें!",
    spending_breakdown_title: "यहाँ **{month}** के लिए आपका खर्च विवरण दिया गया है:",
    fixed_expenses_summary: "आपका **निश्चित खर्च** (बिल, किराया आदि) कुल खर्च का {amount} ({pct}%) है। शेष राशि परिवर्तनीय है। अगले सप्ताह उच्चतम श्रेणियों को कम करने का प्रयास करें!",
    goal_tip_savings: "चूंकि आपका मुख्य लक्ष्य **बचत** है, इसलिए जोखिम भरे निवेशों से पहले एक सुरक्षित उच्च-ब्याज खाते में ३ से ६ महीने का आपातकालीन फंड बनाने पर ध्यान दें।",
    goal_tip_investing: "निवेश लक्ष्य के साथ, एक छोटा आपातकालीन फंड बनाने के बाद, चक्रवृद्धि ब्याज का लाभ उठाने के लिए नियमित रूप से वैश्विक सूचकांक फंडों (जैसे S&P 500 ETF) में निवेश (DCA) शुरू करें।",
    goal_tip_debt_free: "चूंकि आपका लक्ष्य **ऋण-मुक्त** होना है, इसलिए निवेश करने के बजाय इस अतिरिक्त {amount} बचत का उपयोग अपने {remaining} ऋणों को चुकाने में करें।",
    goal_tip_general: "एक संतुलित रणनीति के तहत, आप अपनी शेष राशि का ५0% तरल नकद बचत में और ५0% दीर्घकालिक निवेश में विभाजित कर सकते हैं।",
    ai_coach_tip_saving: "नमस्ते {name}! आप वर्तमान में अपनी मासिक आय {income} से **{amount}** ({rate}% बचत दर) बचा रहे हैं।\n\n💡 **एआई सलाह**: {tip}\n\nइस दर को बढ़ाने के लिए, अपने परिवर्तनीय खर्चों की समीक्षा करें और डैशबोर्ड पर मासिक बजट सीमा निर्धारित करें।",
    ai_coach_tip_deficit: "नमस्ते {name}। इस महीने आपके बजट में **{amount}** की कमी है (आय: {income}, खर्च: {expenses})।\n\n⚠️ **कार्य योजना**: निवेश या बचत शुरू करने से पहले हमें कैश फ्लो संतुलित करना होगा। इस सप्ताह अपने परिवर्तनीय खर्चों में कम से कम {amount} की कटौती करें।",
    fallback_summary_title: "नमस्ते {name}! मैंने आपके वित्तीय लॉग का विश्लेषण किया है और यहाँ **{month}** के लिए आपकी स्थिति दी गई है:",
    fallback_monthly_savings: "मासिक बचत",
    fallback_outstanding_debts: "बकाया ऋण",
    fallback_money_owed: "उधार दिया पैसा जो वापस मिलना है",
    fallback_footer: "अपने बजट, विशिष्ट महीनों (जैसे: \"मई २०२६\"), ऋण या खर्च श्रेणियों के बारे में अधिक जानने के लिए मुझसे पूछें!"
  },
  ar: {
    sure_month: "بالتأكيد {name}، بالنظر إلى سجلك لشهر **{month}**:",
    total_income: "إجمالي الدخل",
    total_expenses: "إجمالي المصاريف",
    net_savings: "صافي الادخار",
    sources: "مصادر",
    logs: "سجلات",
    savings_rate: "معدل الادخار",
    top_expense_cat: "الفئة الأكثر إنفاقاً",
    cash_flow_positive: "كان التدفق النقدي لهذا الشهر إيجابياً، وهذا أمر رائع!",
    cash_flow_negative: "كان التدفق النقدي لهذا الشهر سلبياً. يرجى مراجعة المصاريف لتوازن حساباتك المستقبلية.",
    active_loans_breakdown: "إليك تفاصيل القروض النشطة الحالية، {name}:",
    debts_owed_title: "الديون المستحقة للآخرين (الإجمالي المتبقي: {amount}):",
    debts_borrowed_item: "- **{borrower}**: استعرت {amount} (المدفوع: {paid}، المتبقي: {remaining})",
    no_outstanding_debts: "✓ ليس لديك أي ديون مستحقة للآخرين حالياً.",
    money_owed_to_you_title: "الأموال المستحقة لك من الآخرين (الإجمالي المتبقي: {amount}):",
    debts_lent_item: "- **{borrower}**: أقرضتهم {amount} (المحصل: {collected}، المتبقي: {remaining})",
    no_contacts_owe: "✓ لا توجد مستحقات لك لدى أي جهة اتصال حالياً.",
    payoff_timeline_target: "مع معدل السداد المستهدف البالغ **{target}/شهرياً**، ستتخلص من الديون تماماً في غضون **{months} أشهر** تقريباً.",
    payoff_timeline_savings: "بناءً على وفرتك الحالية البالغة **{savings}/شهرياً**، يمكنك سداد هذا الدين في غضون **{months} أشهر** تقريباً.",
    payoff_timeline_none: "بما أنه ليس لديك ادخار شهري نشط، فكر في تحديد ميزانية لسداد القروض في الإعدادات لتنظيم طريقك نحو التخلص من الديون.",
    repayment_plan_title: "خطة السداد",
    no_expenses_month: "مرحباً {name}، لم تقم بتسجيل أي مصاريف للشهر الحالي ({month}) بعد. أضف مصاريفك اليومية لعرض التفاصيل حسب الفئات!",
    spending_breakdown_title: "إليك تفاصيل الإنفاق حسب الفئات لشهر **{month}**:",
    fixed_expenses_summary: "تشكل **المصاريف الثابتة** (الفواتير، الإيجار، إلخ) ما قيمته {amount} ({pct}% من إجمالي الإنفاق). الباقي متغير. حاول خفض الفئات الأعلى إنفاقاً الأسبوع القادم!",
    goal_tip_savings: "بما أن هدفك الأساسي هو **الادخار**، ركز على بناء صندوق طوارئ يغطي مصاريف من ٣ إلى ٦ أشهر في حساب آمن وعالي العائد قبل الاستثمار في أصول عالية المخاطر.",
    goal_tip_investing: "مع تحديد هدفك على **الاستثمار**، بمجرد بناء صندوق طوارئ صغير، ابدأ في الاستثمار المنتظم (DCA) في صناديق المؤشرات العالمية (مثل ETFs لـ S&P 500) للاستفادة من العوائد المركبة.",
    goal_tip_debt_free: "بما أن هدفك هو **التخلص من الديون**، خصص هذا الفائض البالغ {amount} لسداد ديونك المتبقية البالغة {remaining} بدلاً من استثمارها.",
    goal_tip_general: "باستخدام استراتيجية متوازنة، يمكنك تقسيم رصيدك المتبقي بنسبة 50/50 بين الادخار النقدي السائل والاستثمارات طويلة الأجل.",
    ai_coach_tip_saving: "مرحباً {name}! أنت تدخر حالياً **{amount}** (معدل ادخار {rate}%) من دخلك الشهري البالغ {income}.\n\n💡 **نصيحة الذكاء الاصطناعي**: {tip}\n\nلزيادة هذا المعدل، راجع مصاريفك المتغيرة وضع حداً للميزانية الشهرية.",
    ai_coach_tip_deficit: "مرحباً {name}. ميزانيتك تعاني من عجز بقيمة **{amount}** هذا الشهر (الدخل: {income}، المصاريف: {expenses}).\n\n⚠️ **خطة العمل**: قبل التخطيط للاستثمار أو الادخار، نحتاج لموازنة تدفقك النقدي. حاول تقليص مصاريفك المتغيرة بمقدار {amount} على الأقل هذا الأسبوع.",
    fallback_summary_title: "مرحباً {name}! لقد قمت بتحليل بياناتك المالية وإليك حالتك لشهر **{month}**:",
    fallback_monthly_savings: "الادخار الشهري",
    fallback_outstanding_debts: "الديون المستحقة للآخرين",
    fallback_money_owed: "الأموال المستحقة لك",
    fallback_footer: "اسألني عن تفاصيل ميزانيتك، أو أشهر معينة (مثل \"مايو ٢٠٢٦\")، أو القروض، أو فئات الإنفاق للحصول على تحليل مخصص!"
  },
  ja: {
    sure_month: "了解しました、{name}さん。**{month}** の家計状況です:",
    total_income: "総収入",
    total_expenses: "総支出",
    net_savings: "純貯蓄",
    sources: "件の収入源",
    logs: "件의 기록",
    savings_rate: "貯蓄率",
    top_expense_cat: "最大の支出カテゴリ",
    cash_flow_positive: "今月のキャッシュフローは黒字です。素晴らしいですね！",
    cash_flow_negative: "今月のキャッシュフローは赤字です。今後の収支を改善するために支出を見直しましょう。",
    active_loans_breakdown: "{name}さんの現在の借入・貸出の状況です:",
    debts_owed_title: "他者への債務 (合計残高: {amount}):",
    debts_borrowed_item: "- **{borrower}**: {amount} を借入 (返済済: {paid}、残高: {remaining})",
    no_outstanding_debts: "✓ 現在、他者への未返済の債務はありません。",
    money_owed_to_you_title: "知人からの回収予定の貸付金 (合計残高: {amount}):",
    debts_lent_item: "- **{borrower}**: {amount} を貸付 (回収済: {collected}、残高: {remaining})",
    no_contacts_owe: "✓ 現在、知人からの未回収の貸付金はありません。",
    payoff_timeline_target: "設定された返済目標額 **{target}/月** に基づくと、約 **{months}ヶ月** で完済できます。",
    payoff_timeline_savings: "今月の残高 **{savings}/月** に基づくと、約 **{months}ヶ月** で完済できます。",
    payoff_timeline_none: "現在、アクティブな月間貯蓄がないため、設定で月々の返済予算を決めて計画的に返済することをお勧めします。",
    repayment_plan_title: "返済計画",
    no_expenses_month: "こんにちは {name}さん、当月 ({month}) の支出がまだ記録されていません。日々の支出を記録してカテゴリ別の分析を確認しましょう！",
    spending_breakdown_title: "**{month}** のカテゴリ別支出内訳は以下の通りです:",
    fixed_expenses_summary: "固定費 (家賃・光熱費など) は {amount} で、総支出の {pct}% を占めています。残りは変動費です。来週は支出の多いカテゴリを抑えるよう意識してみましょう！",
    goal_tip_savings: "主な目標が **「貯蓄」** であるため、リスクのある投資を始める前に、まずは安全な高金利口座で3〜6ヶ月分の生活費相当の緊急資金を確保することに集中しましょう。",
    goal_tip_investing: "目標が **「投資」** であるため、少額の緊急資金を確保した後は、複利効果を得るためにインデックスファンド (S&P 500等) に毎月積立投資 (DCA) することをお勧めします。",
    goal_tip_debt_free: "目標が **「負債ゼロ」** であるため、余剰の {amount} は投資に回さず、未返済の債務 {remaining} の返済に優先的に割り当ててください。",
    goal_tip_general: "バランスの取れた戦略として、余剰金を流動的な預貯金に50%、長期投資に50%の割合で振り分けることをお勧めします。",
    ai_coach_tip_saving: "こんにちは {name}さん！現在、月間収入 {income} のうち **{amount}** (貯蓄率 {rate}%) を貯蓄できています。\n\n💡 **AIアドバイス**: {tip}\n\n貯蓄率をさらに上げるために、変動費を見直し、月間の予算制限を設定してみましょう。",
    ai_coach_tip_deficit: "こんにちは {name}さん。今月は **{amount}** の赤字となっています (収入: {income}、支出: {expenses})。\n\n⚠️ **アクションプラン**: 投資や貯蓄を考える前に、収支をトントンにする必要があります。今週は変動費を少なくとも {amount} 削減することを目指してください。",
    fallback_summary_title: "こんにちは {name}さん！家計データを分析しました。**{month}** のステータスは以下の通りです:",
    fallback_monthly_savings: "月間貯蓄",
    fallback_outstanding_debts: "未返済の負債",
    fallback_money_owed: "貸付中の資金",
    fallback_footer: "予算、特定の月 (例: 「2026年5月」)、ローン、または支出カテゴリについての詳細を質問すると、より詳しい分析が受けられます！"
  }
};

const formatValue = (template, params) => {
  let res = template;
  Object.keys(params).forEach(k => {
    res = res.replace(new RegExp(`{${k}}`, 'g'), params[k]);
  });
  return res;
};

// Generate a rule-based mock response if no API key is set
const generateMockResponse = (user, allIncomes, allExpenses, loans, userMessage) => {
  const currency = user.currency || '$';
  const name = user.username;
  const goal = user.financialGoal;
  const target = user.monthlyLoanTarget;
  const msgLower = userMessage.toLowerCase();
  const lang = user.language || 'en';
  const dict = MOCK_DICTS[lang] || MOCK_DICTS['en'];

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
  const formatMonthName = (monthStr, currentLang = 'en') => {
    const [year, m] = monthStr.split('-');
    const date = new Date(year, parseInt(m) - 1, 1);
    return date.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });
  };

  // Check 1: User asks for a specific month (e.g. "May", "June", "2026-05")
  const monthsKeys = Object.keys(financialDataByMonth);
  const monthMatch = monthsKeys.find(m => msgLower.includes(m.toLowerCase()) || msgLower.includes(formatMonthName(m, 'en').toLowerCase()) || msgLower.includes(formatMonthName(m, lang).toLowerCase()));
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

    const localizedMonth = formatMonthName(monthMatch, lang);
    let reply = formatValue(dict.sure_month, { name, month: localizedMonth }) + '\n\n';
    reply += `- **${dict.total_income}**: ${currency}${mData.income.toLocaleString(lang)} (${mData.sources.length} ${dict.sources})\n`;
    reply += `- **${dict.total_expenses}**: ${currency}${totalExp.toLocaleString(lang)} (${mData.expenses.length} ${dict.logs})\n`;
    reply += `- **${dict.net_savings}**: ${currency}${net.toLocaleString(lang)} (${mData.income > 0 ? Math.round((net / mData.income) * 100) : 0}% ${dict.savings_rate})\n`;
    
    if (highestCat) {
      reply += `- **${dict.top_expense_cat}**: ${highestCat} (${currency}${catMap[highestCat].toLocaleString(lang)})\n\n`;
    } else {
      reply += '\n';
    }
    
    reply += net >= 0 ? dict.cash_flow_positive : dict.cash_flow_negative;
    return reply;
  }

  // Check 2: User asks about active loans, debt, or who owes whom
  if (msgLower.includes('loan') || msgLower.includes('debt') || msgLower.includes('owe') || msgLower.includes('borrow') || msgLower.includes('lend') || msgLower.includes('pay')) {
    let reply = formatValue(dict.active_loans_breakdown, { name }) + '\n\n';
    
    if (activeBorrowedList.length > 0) {
      reply += `**${formatValue(dict.debts_owed_title, { amount: currency + remainingBorrowed.toLocaleString(lang) })}**\n`;
      activeBorrowedList.forEach(l => {
        const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
        reply += formatValue(dict.debts_borrowed_item, {
          borrower: l.borrowerName,
          amount: currency + l.amount.toLocaleString(lang),
          paid: currency + paid.toLocaleString(lang),
          remaining: currency + (l.amount - paid).toLocaleString(lang)
        }) + '\n';
      });
    } else {
      reply += dict.no_outstanding_debts + '\n';
    }
    
    reply += `\n`;

    if (activeLentList.length > 0) {
      reply += `**${formatValue(dict.money_owed_to_you_title, { amount: currency + remainingLent.toLocaleString(lang) })}**\n`;
      activeLentList.forEach(l => {
        const paid = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
        reply += formatValue(dict.debts_lent_item, {
          borrower: l.borrowerName,
          amount: currency + l.amount.toLocaleString(lang),
          collected: currency + paid.toLocaleString(lang),
          remaining: currency + (l.amount - paid).toLocaleString(lang)
        }) + '\n';
      });
    } else {
      reply += dict.no_contacts_owe + '\n';
    }

    if (remainingBorrowed > 0) {
      let timeLine = '';
      if (target > 0) {
        timeLine = formatValue(dict.payoff_timeline_target, {
          target: currency + target.toLocaleString(lang),
          months: Math.ceil(remainingBorrowed / target)
        });
      } else if (currentRemaining > 0) {
        timeLine = formatValue(dict.payoff_timeline_savings, {
          savings: currency + currentRemaining.toLocaleString(lang),
          months: Math.ceil(remainingBorrowed / currentRemaining)
        });
      } else {
        timeLine = dict.payoff_timeline_none;
      }
      reply += `\n🎯 **${dict.repayment_plan_title}**: ${timeLine}`;
    }

    return reply;
  }

  // Check 3: User asks about spending categories or where their money goes
  if (msgLower.includes('category') || msgLower.includes('categories') || msgLower.includes('spend') || msgLower.includes('spent') || msgLower.includes('expense') || msgLower.includes('expenses')) {
    const localizedMonth = formatMonthName(currentMonth, lang);
    if (currentData.expenses.length === 0) {
      return formatValue(dict.no_expenses_month, { name, month: localizedMonth });
    }

    const catMap = {};
    currentData.expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    const sortedCats = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);
    let breakdown = formatValue(dict.spending_breakdown_title, { month: localizedMonth }) + '\n\n';
    sortedCats.forEach(cat => {
      const pct = currentExpenses > 0 ? Math.round((catMap[cat] / currentExpenses) * 100) : 0;
      breakdown += `- **${cat}**: ${currency}${catMap[cat].toLocaleString(lang)} (${pct}%)\n`;
    });

    const fixedExpenses = currentData.expenses.filter(e => e.isFixed);
    const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const fixedPct = currentExpenses > 0 ? Math.round((fixedTotal / currentExpenses) * 100) : 0;
    
    breakdown += '\n' + formatValue(dict.fixed_expenses_summary, {
      amount: currency + fixedTotal.toLocaleString(lang),
      pct: fixedPct
    });
    
    return breakdown;
  }

  // Check 4: User asks for savings tips, advice, or goals
  if (msgLower.includes('tip') || msgLower.includes('save') || msgLower.includes('budget') || msgLower.includes('advice') || msgLower.includes('invest') || msgLower.includes('plan')) {
    if (currentRemaining > 0) {
      const rate = Math.round((currentRemaining / currentIncome) * 100);
      let strategyTip = '';
      if (goal === 'savings') {
        strategyTip = dict.goal_tip_savings;
      } else if (goal === 'investing') {
        strategyTip = dict.goal_tip_investing;
      } else if (goal === 'debt-free') {
        strategyTip = formatValue(dict.goal_tip_debt_free, {
          amount: currency + currentRemaining.toLocaleString(lang),
          remaining: currency + remainingBorrowed.toLocaleString(lang)
        });
      } else {
        strategyTip = dict.goal_tip_general;
      }

      return formatValue(dict.ai_coach_tip_saving, {
        name,
        amount: currency + currentRemaining.toLocaleString(lang),
        rate,
        income: currency + currentIncome.toLocaleString(lang),
        tip: strategyTip
      });
    } else {
      const deficit = Math.abs(currentRemaining);
      return formatValue(dict.ai_coach_tip_deficit, {
        name,
        amount: currency + deficit.toLocaleString(lang),
        income: currency + currentIncome.toLocaleString(lang),
        expenses: currency + currentExpenses.toLocaleString(lang)
      });
    }
  }

  // General Status Overview (Fallback)
  const rate = currentIncome > 0 ? Math.round((currentRemaining / currentIncome) * 100) : 0;
  const localizedMonth = formatMonthName(currentMonth, lang);
  return formatValue(dict.fallback_summary_title, { name, month: localizedMonth }) + '\n\n' +
    `- **${dict.total_income}**: ${currency}${currentIncome.toLocaleString(lang)}\n` +
    `- **${dict.total_expenses}**: ${currency}${currentExpenses.toLocaleString(lang)}\n` +
    `- **${dict.fallback_monthly_savings}**: ${currency}${currentRemaining.toLocaleString(lang)} (${rate}% ${dict.savings_rate})\n` +
    `- **${dict.fallback_outstanding_debts}**: ${currency}${remainingBorrowed.toLocaleString(lang)}\n` +
    `- **${dict.fallback_money_owed}**: ${currency}${remainingLent.toLocaleString(lang)}\n\n` +
    dict.fallback_footer;
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
You must write your response entirely in the language corresponding to language code: '${user.language || 'en'}' (e.g. 'en' for English, 'es' for Spanish, 'de' for German, 'bn' for Bengali, 'hi' for Hindi, 'ar' for Arabic, 'ja' for Japanese). Make sure all your financial tips, explanations, and greetings are translated naturally and natively.

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
You must write your tips entirely in the language corresponding to language code: '${user.language || 'en'}' (e.g. 'en' for English, 'es' for Spanish, 'de' for German, 'bn' for Bengali, 'hi' for Hindi, 'ar' for Arabic, 'ja' for Japanese). Make sure all your tips, alerts, and suggestions are translated naturally and natively.
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

// Helper to mock parsing of text commands
const parseTextMock = (text) => {
  const clean = text.toLowerCase();
  let amount = 0;
  let title = 'Expense';
  let category = 'Other';

  // Try to find amount: e.g. "$25", "25 dollars", "spent 25", "spent 25.50"
  const amountMatch = clean.match(/(?:\$|spent\s*|amount\s*|for\s*|cost\s*|costs\s*|of\s*)?(\d+(?:\.\d+)?)(?:\s*(?:dollars|bucks|usd|৳|tk|euros|pounds))?/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  // Try to guess category and title
  if (clean.includes('lunch') || clean.includes('dinner') || clean.includes('food') || clean.includes('eat') || clean.includes('restaurant') || clean.includes('mcdonald') || clean.includes('burger') || clean.includes('pizza') || clean.includes('coffee') || clean.includes('starbucks')) {
    title = clean.includes('coffee') || clean.includes('starbucks') ? "Coffee Run" : "Food / Dining";
    category = "Food";
  } else if (clean.includes('taxi') || clean.includes('cab') || clean.includes('uber') || clean.includes('gas') || clean.includes('fuel') || clean.includes('bus') || clean.includes('ride') || clean.includes('transport')) {
    title = clean.includes('gas') || clean.includes('fuel') ? "Gas Fillup" : "Transport Ride";
    category = "Transport";
  } else if (clean.includes('rent') || clean.includes('apartment') || clean.includes('flat') || clean.includes('stay')) {
    title = "House Rent";
    category = "Rent";
  } else if (clean.includes('bill') || clean.includes('electricity') || clean.includes('water') || clean.includes('internet') || clean.includes('wifi') || clean.includes('utility')) {
    title = clean.includes('internet') || clean.includes('wifi') ? "Internet Bill" : "Utility Bill";
    category = "Utilities";
  } else if (clean.includes('movie') || clean.includes('netflix') || clean.includes('spotify') || clean.includes('game') || clean.includes('play') || clean.includes('show') || clean.includes('cinema')) {
    title = clean.includes('netflix') ? "Netflix Subscription" : "Entertainment";
    category = "Entertainment";
  } else if (clean.includes('doctor') || clean.includes('medicine') || clean.includes('health') || clean.includes('clinic') || clean.includes('pharma') || clean.includes('dentist')) {
    title = "Medical / Health";
    category = "Health";
  } else if (clean.includes('shop') || clean.includes('buy') || clean.includes('store') || clean.includes('amazon') || clean.includes('target') || clean.includes('clothing') || clean.includes('groceries')) {
    title = "Shopping Entry";
    category = "Shopping";
  } else if (clean.includes('course') || clean.includes('book') || clean.includes('school') || clean.includes('tuition') || clean.includes('class')) {
    title = "Education / Study";
    category = "Education";
  }

  // Extract a sensible merchant title if we can find words
  // e.g. "spent 25 at Walmart" -> Walmart
  const atMatch = clean.match(/(?:at|in|on)\s+([a-z0-9\s]+?)(?:\s+today|\s+yesterday|\s*[\.\,\!]|$)/i);
  if (atMatch && atMatch[1].trim().length > 0) {
    const candidate = atMatch[1].trim();
    // Capitalize first letters
    title = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return { title, amount, category, isMock: true };
};

// Helper to mock categorization of titles
const categorizeTitleMock = (title) => {
  const clean = title.toLowerCase().trim();
  if (clean.includes('mcdonald') || clean.includes('burger') || clean.includes('coffee') || clean.includes('starbucks') || clean.includes('food') || clean.includes('dining') || clean.includes('restaurant') || clean.includes('pizza') || clean.includes('kfc') || clean.includes('subway') || clean.includes('dinner') || clean.includes('lunch') || clean.includes('breakfast')) {
    return "Food";
  }
  if (clean.includes('uber') || clean.includes('lyft') || clean.includes('taxi') || clean.includes('gas') || clean.includes('fuel') || clean.includes('train') || clean.includes('metro') || clean.includes('bus') || clean.includes('ride') || clean.includes('transportation')) {
    return "Transport";
  }
  if (clean.includes('rent') || clean.includes('flat') || clean.includes('hostel') || clean.includes('stay') || clean.includes('apartment') || clean.includes('housing')) {
    return "Rent";
  }
  if (clean.includes('electricity') || clean.includes('water') || clean.includes('internet') || clean.includes('wifi') || clean.includes('power') || clean.includes('utility') || clean.includes('gas bill') || clean.includes('bills')) {
    return "Utilities";
  }
  if (clean.includes('netflix') || clean.includes('spotify') || clean.includes('disney') || clean.includes('hulu') || clean.includes('movie') || clean.includes('cinema') || clean.includes('game') || clean.includes('steam') || clean.includes('nintendo') || clean.includes('xbox') || clean.includes('playstation')) {
    return "Entertainment";
  }
  if (clean.includes('pharmacy') || clean.includes('doctor') || clean.includes('hospital') || clean.includes('medicine') || clean.includes('dentist') || clean.includes('clinic') || clean.includes('health') || clean.includes('vitamin') || clean.includes('pharma')) {
    return "Health";
  }
  if (clean.includes('shopping') || clean.includes('amazon') || clean.includes('walmart') || clean.includes('grocery') || clean.includes('groceries') || clean.includes('target') || clean.includes('clothing') || clean.includes('mall') || clean.includes('buy') || clean.includes('purchase')) {
    return "Shopping";
  }
  if (clean.includes('book') || clean.includes('tuition') || clean.includes('course') || clean.includes('school') || clean.includes('college') || clean.includes('udemy') || clean.includes('coursera') || clean.includes('education') || clean.includes('class') || clean.includes('lecture')) {
    return "Education";
  }
  return "Other";
};

// @desc    Parse natural language text command into expense details
// @route   POST /api/ai/parse-text
// @access  Private
const parseTextCommand = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text command is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const mockResult = parseTextMock(text);
    return res.status(200).json(mockResult);
  }

  try {
    const prompt = `You are a smart personal finance parser. Read this text message and extract the expense details (merchant/title, total amount, and category). The allowed categories are: ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other']. Return ONLY a raw JSON block matching this exact structure:
{
  "title": "Expense Title",
  "amount": 25.50,
  "category": "Food"
}
Do not enclose the JSON inside markdown code blocks (like \`\`\`json). Just return the raw JSON string. If you cannot extract or guess the fields, return default values. Text command: "${text}"`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.2 }
      })
    });

    if (!apiResponse.ok) {
      throw new Error('Gemini API returned error ' + apiResponse.status);
    }

    const responseData = await apiResponse.json();
    const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsedData = { title: 'Expense Entry', amount: 0, category: 'Other' };
    try {
      let cleanText = replyText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      parsedData = JSON.parse(cleanText);
    } catch (err) {
      console.error('Failed to parse Gemini text parse output:', replyText);
    }

    res.status(200).json({
      title: parsedData.title || 'Expense Entry',
      amount: parsedData.amount || 0,
      category: parsedData.category || 'Other'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Parse audio voice command (base64) into expense details
// @route   POST /api/ai/parse-voice
// @access  Private
const parseVoiceCommand = async (req, res) => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) {
    return res.status(400).json({ message: 'Audio base64 data is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    // Return a mock result after small delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return res.status(200).json({
      title: 'Voice Expense (Mock)',
      amount: 25.00,
      category: 'Food',
      isMock: true
    });
  }

  try {
    let cleanBase64 = audioBase64;
    if (audioBase64.includes(';base64,')) {
      const parts = audioBase64.split(';base64,');
      cleanBase64 = parts[1];
    }

    const prompt = `You are a smart personal finance voice assistant. Listen to this voice note and extract the expense details (merchant/title, total amount, and category). The allowed categories are: ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other']. Return ONLY a raw JSON block matching this exact structure:
{
  "title": "Expense Title",
  "amount": 25.50,
  "category": "Food"
}
Do not enclose the JSON inside markdown code blocks (like \`\`\`json). Just return the raw JSON string. If you cannot hear or extract the fields, guess based on context.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const actualMimeType = mimeType || 'audio/mp4';

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: actualMimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: { maxOutputTokens: 200, temperature: 0.2 }
      })
    });

    if (!apiResponse.ok) {
      throw new Error('Gemini API returned error ' + apiResponse.status);
    }

    const responseData = await apiResponse.json();
    const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsedData = { title: 'Voice Expense', amount: 0, category: 'Other' };
    try {
      let cleanText = replyText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      parsedData = JSON.parse(cleanText);
    } catch (err) {
      console.error('Failed to parse Gemini voice parse output:', replyText);
    }

    res.status(200).json({
      title: parsedData.title || 'Voice Expense',
      amount: parsedData.amount || 0,
      category: parsedData.category || 'Other'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auto-categorize expense based on merchant/title
// @route   POST /api/ai/categorize
// @access  Private
const categorizeTitle = async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const mockCategory = categorizeTitleMock(title);
    return res.status(200).json({ category: mockCategory });
  }

  try {
    const prompt = `Classify this merchant/expense title: "${title}" into exactly one of these categories: ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other']. Return ONLY the category name. Do not return any other text, quotes, markdown, or explanation. Just the raw string.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0.1 }
      })
    });

    if (!apiResponse.ok) {
      throw new Error('Gemini API returned error ' + apiResponse.status);
    }

    const responseData = await apiResponse.json();
    const category = (responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'Other').trim();
    
    // Validate returned category is in standard list
    const allowed = ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other'];
    const matched = allowed.find(c => c.toLowerCase() === category.toLowerCase()) || 'Other';

    res.status(200).json({ category: matched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAICoachResponse,
  scanReceiptImage,
  getAICoachTips,
  parseTextCommand,
  parseVoiceCommand,
  categorizeTitle,
};

