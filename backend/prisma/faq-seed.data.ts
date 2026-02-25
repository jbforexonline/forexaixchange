/**
 * Initial FAQ seed data for ForexAiXchange.
 * Only seeded when FaqItem table is empty.
 */
export const FAQ_SEED = [
  // 1. General Information
  {
    category: 'General Information',
    question: 'What is ForexAiXchange?',
    answer:
      'ForexAiXchange is an AI-powered prediction game inspired by the real forex market. Instead of trading charts directly, our system transforms forex market data into simplified spins where you can predict outcomes like Buy, Sell, or Indecision.',
    sortOrder: 0,
  },
  {
    category: 'General Information',
    question: 'How does the spin game work?',
    answer:
      'Each spin is generated using AI models trained on forex movements and volatility patterns. Players choose from Buy, Sell, Indecision, High or Low Volatility, Red and Blue. While chance plays a role, those who follow market news, analyze trends, or review past spin results may improve their accuracy over time.',
    sortOrder: 1,
  },
  {
    category: 'General Information',
    question: 'Is this real forex trading?',
    answer:
      'ForexAiXchange is not a broker and does not involve direct market positions. However, it is built on forex market data and logic, making the experience similar to trading — but faster, simpler, and more exciting.',
    sortOrder: 2,
  },
  {
    category: 'General Information',
    question: 'Can I try the platform for free before depositing?',
    answer:
      'Yes, Demo Mode is available so you can practice strategies, test predictions, and analyze results without risk.',
    sortOrder: 3,
  },
  {
    category: 'General Information',
    question: 'Listed products?',
    answer: `BUY 📈 – Bet on the market to rise. AI insights show how traders push upward momentum — choose BUY if you believe the bulls will dominate this spin.

SELL 📉 – Predict the market will fall. When sellers are stronger, prices push down. Choose SELL if you think the bears take control in this round.

HIGH VOLATILE ⚡ – Expect big moves, no matter the direction. High volatility means more risk, but also more reward. Go HIGH VOLATILE if you trust momentum will shake the market hard.

LOW VOLATILE 🌙 – Calm and stable moves. LOW VOLATILE is for players who think the market will move less and stay balanced. A safer but strategic choice.

RED 🔴 – Red represents a bearish tone. Bet RED if you believe this round aligns with sellers taking the lead.

BLUE 🔵 – Blue symbolizes bullish energy. Choose BLUE if you trust buyers to dominate this spin.

INDECISION ⚖️❓ – Sometimes the market gives no clear winner. INDECISION is the rarest outcome — tough to catch but highly rewarding when it strikes.`,
    sortOrder: 4,
  },
  // 2. Accounts & Verification
  {
    category: 'Accounts & Verification',
    question: 'What is a Verification Badge?',
    answer:
      'A Verification Badge marks you as a trusted and active trader on ForexAiXchange. Verified members gain access to more features and credibility within the community.',
    sortOrder: 0,
  },
  {
    category: 'Accounts & Verification',
    question: 'How do I qualify for a Verification Badge?',
    answer:
      'You can qualify by: Upgrading to Premium, or Reaching a minimum of $1,000 in weekly transactions.',
    sortOrder: 1,
  },
  {
    category: 'Accounts & Verification',
    question: 'Can I lose my Verification Badge?',
    answer: 'Yes, inactivity, suspicious behavior, or fraud can lead to badge removal.',
    sortOrder: 2,
  },
  {
    category: 'Accounts & Verification',
    question: 'What is the difference between a Free and a Premium account?',
    answer:
      'Free users enjoy the core spin game but cannot cancel orders once placed. Premium users enjoy order cancellation, exclusive chart room access, faster withdrawals, AI insights, and a badge.',
    sortOrder: 3,
  },
  {
    category: 'Accounts & Verification',
    question: 'How do I verify my account?',
    answer:
      'Go to Profile → Verification. Upload a government ID (passport or national ID) and a selfie. Most verifications finish in minutes.',
    sortOrder: 4,
  },
  // 3. Deposits & Withdrawals
  {
    category: 'Deposits & Withdrawals',
    question: 'How can I deposit or withdraw if I am in Rwanda?',
    answer:
      'You can use Mobile Money (MoMo) directly from your dashboard. This is the official supported method for local users and ensures instant and secure transactions.',
    sortOrder: 0,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'What if I am outside Rwanda?',
    answer:
      'Our official payment method is Mobile Money (MoMo). For international players, we support alternative methods like Perfect Money, Chipper Cash, crypto, Visa/Mastercard, bank transfer, and global money transfer (WorldRemit, Western Union, MoneyGram etc) through our finance team. Please contact support for details. Once your funds are received and verified by our team, your account balance will be updated manually and confirmed by notification.',
    sortOrder: 1,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'Why are international payments not inside the website?',
    answer:
      'To comply with current licensing rules, only Mobile Money is officially available in-platform. Other payment methods are handled by our dedicated payment team for international users. This keeps your transactions safe while allowing us to serve global players.',
    sortOrder: 2,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'How long do international payments take?',
    answer: `Depending on the method:
• Crypto: within 1–2 hours (after confirmations)
• Visa/Mastercard: within 24 hours
• Bank transfer: 1–3 working days
• WorldRemit/Western Union: same day once received`,
    sortOrder: 3,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'Is this safe?',
    answer:
      'Yes. Every payment is verified by our finance team before your balance is credited. Always contact official support for instructions to avoid scams.',
    sortOrder: 4,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'Are there any fees when I deposit?',
    answer:
      'Deposits into ForexAiXchange are free of charge. However, depending on your mobile money provider or bank, you may be charged a small transfer/network fee on their side.',
    sortOrder: 5,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'Are there any fees when I withdraw?',
    answer: `Yes, a small withdrawal fee applies to cover transaction and processing costs:
• $0–$49 → $1
• $50–$99 → $2
• $100–$499 → $3
• $500–$1,999 → $6
• $2,000+ → 1% of the balance`,
    sortOrder: 6,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'Why is there a withdrawal fee?',
    answer:
      'The withdrawal fee helps us maintain fast processing, secure transactions, and stable liquidity for all users. Many platforms use similar network/processing fees.',
    sortOrder: 7,
  },
  {
    category: 'Deposits & Withdrawals',
    question: 'What is the daily withdrawal limit?',
    answer: 'Free users → up to $2,000 per day. Premium users → no withdrawal limits.',
    sortOrder: 8,
  },
  // 4. Spin Game / Gameplay
  {
    category: 'Spin Game / Gameplay',
    question: 'What options can I choose in the spin?',
    answer:
      'Buy, Sell, Indecision, High Volatility, Low Volatility, Red and Blue. Each reflects a market-like condition simplified for prediction.',
    sortOrder: 0,
  },
  {
    category: 'Spin Game / Gameplay',
    question: 'How does the countdown timer work?',
    answer:
      'Each round has a timer. You must place your choice before it closes — just like entering before a market candle finishes.',
    sortOrder: 1,
  },
  {
    category: 'Spin Game / Gameplay',
    question: 'Can I cancel my order after placing it?',
    answer:
      'Free users cannot cancel. Premium users can cancel orders during the countdown, giving more control.',
    sortOrder: 2,
  },
  {
    category: 'Spin Game / Gameplay',
    question: 'Can my forex knowledge really help me here?',
    answer:
      'Yes. While results are AI-driven, ForexAiXchange rewards players who study previous results, understand volatility, follow news events, and apply trading psychology. It is designed to feel like a skill game, not just luck.',
    sortOrder: 3,
  },
  {
    category: 'Spin Game / Gameplay',
    question: 'Where can I see my past results?',
    answer:
      "In the History tab, including your bet size, outcome (win/loss), date, and the AI's result for that spin.",
    sortOrder: 4,
  },
  // 5. Affiliate Program
  {
    category: 'Affiliate Program',
    question: 'How does the affiliate program work?',
    answer:
      "Unlike traditional referral systems, our affiliate model rewards you based on your referrals' withdrawals. The more they play toward withdrawal goals, the more you earn.",
    sortOrder: 0,
  },
  {
    category: 'Affiliate Program',
    question: 'How much can I earn from referrals?',
    answer: `You earn daily depending on your referral's withdrawal amount:
• $0–$49 → $0
• $50–$99 → $1
• $100–$499 → $2
• $500–$1,999 → $5
• $2,000+ → $7`,
    sortOrder: 1,
  },
  {
    category: 'Affiliate Program',
    question: 'Is commission unlimited?',
    answer:
      'Each referral provides commission once per day, encouraging long-term growth rather than repeated micro-withdrawals.',
    sortOrder: 2,
  },
  // 6. Premium Features
  {
    category: 'Premium Features',
    question: 'What do Premium users get?',
    answer:
      "Premium unlocks: Order cancellation rights, Access to Members' Chart Room (community sentiment & live strategies), Faster support and withdrawals, Verification Badge, More detailed AI market insights, etc.",
    sortOrder: 0,
  },
  {
    category: 'Premium Features',
    question: "What is the Members' Chart Room?",
    answer:
      "A live space where verified and premium users share strategies, analyze AI charts, and discuss upcoming spins. This is where real forex-like experience meets community prediction.",
    sortOrder: 1,
  },
  {
    category: 'Premium Features',
    question: 'What is included in the premium package and benefits?',
    answer: `✅ Verification Badge – Show your trusted status on your account.
✅ Internal Transfers – Instantly send funds to other ForexAiXchange users. Perfect for helping friends or business partners fund their accounts.
✅ Flexible Spin Timing – Enjoy ForexAiXchange spins in 5 minutes or adjust to your preference.
✅ Auto-Press Orders – Set automatic orders for up to 50 future spins.
✅ High Order Limits – Place up to $200 per order instantly.
✅ Unlimited Withdrawals – No daily limits (Standard users capped at $2,000/day).
✅ Members' Chart Room Access – Join live strategy discussions and market ideas.`,
    sortOrder: 2,
  },
  {
    category: 'Premium Features',
    question: 'How much does Premium Subscription cost on ForexAiXchange?',
    answer: `Premium is flexible — you can choose the plan that fits you best:
• 1 Month Plan → $10 (≈ 12,000 RWF)
• 6 Month Plan → $50 (≈ 60,000 RWF) — Save 17% compared to monthly.
• 1 Year Plan → $90 (≈ 108,000 RWF) — Save 25% compared to monthly.
Longer plans give you more value and savings.`,
    sortOrder: 3,
  },
  {
    category: 'Premium Features',
    question: 'What is Internal Transfer on ForexAiXchange?',
    answer:
      'Internal Transfer allows Premium users to send funds directly to other ForexAiXchange users. It\'s a fast way to move money between accounts without going through withdrawal and deposit steps.',
    sortOrder: 4,
  },
  {
    category: 'Premium Features',
    question: 'Who can use Internal Transfer?',
    answer:
      'This service is available only for Premium members with a verified account. Free users cannot access this feature.',
    sortOrder: 5,
  },
  {
    category: 'Premium Features',
    question: 'Are there fees for Internal Transfer?',
    answer: `Yes, a small flat fee applies:
• $0–$49 → $1
• $50–$99 → $2
• $100–$499 → $3
• $500–$1,999 → $6
• $2,000+ → 1% of the balance
The fee is paid by the sender by default.`,
    sortOrder: 6,
  },
  {
    category: 'Premium Features',
    question: 'Is Internal Transfer instant?',
    answer:
      'Every Internal Transfer is reviewed and approved by our Finance Team. Processing usually takes up to 24 hours for security.',
    sortOrder: 7,
  },
  {
    category: 'Premium Features',
    question: 'What if I arrange off-platform payment with another user?',
    answer:
      'ForexAiXchange is not responsible for off-platform settlements between users. Make sure you trust the other party before arranging any external payment.',
    sortOrder: 8,
  },
  // 7. Security & Trust
  {
    category: 'Security & Trust',
    question: 'Is my money safe?',
    answer: 'Yes. Transactions are encrypted and handled via secure gateways.',
    sortOrder: 0,
  },
  {
    category: 'Security & Trust',
    question: 'Does AI manipulate results?',
    answer:
      'No. AI is used to interpret market-like data and generate fair spin results. Everyone plays under the same rules.',
    sortOrder: 1,
  },
  {
    category: 'Security & Trust',
    question: 'Can I rely only on luck?',
    answer:
      'While luck plays a role, consistent winners are often those who combine luck with skill — analyzing history, market trends, and volatility.',
    sortOrder: 2,
  },
  // 8. Support & Maintenance
  {
    category: 'Support & Maintenance',
    question: 'Why is the website under maintenance?',
    answer:
      'Maintenance ensures stability and allows us to improve AI models. During downtime, affected spins are refunded to your account.',
    sortOrder: 0,
  },
  {
    category: 'Support & Maintenance',
    question: 'How do I contact support?',
    answer:
      'Via live chat, email, or support tickets in your dashboard. Premium users enjoy 24/7 priority support.',
    sortOrder: 1,
  },
];
