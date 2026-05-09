const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./generated/client');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient({});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());

// --- TRANSACTIONS ---

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { amount, type, category, description, date } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, category, description, date } = req.body;
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// --- INVESTMENTS ---

app.get('/api/investments', async (req, res) => {
  try {
    const investments = await prisma.investment.findMany({
      orderBy: { date: 'desc' },
      include: {
        purchases: {
          orderBy: { date: 'desc' }
        },
        dividendRecords: {
          orderBy: { date: 'desc' }
        }
      }
    });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

app.post('/api/investments', async (req, res) => {
  try {
    const { name, category, investedAmount, currentValue, dividends, date, quantity = 1, unitType = 'Unit', averagePrice = 0, lastPricePerUnit = 0 } = req.body;
    
    // Check if investment with same name exists (case-insensitive search manually or exact)
    const existing = await prisma.investment.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
      // Merge logic
      const newInvestedAmount = existing.investedAmount + parseFloat(investedAmount);
      const newQuantity = (existing.quantity || 0) + parseFloat(quantity);
      const newAveragePrice = newQuantity > 0 ? newInvestedAmount / newQuantity : 0;
      const latestPrice = parseFloat(lastPricePerUnit) > 0 ? parseFloat(lastPricePerUnit) : (existing.lastPricePerUnit || 0);
      const newCurrentValue = newQuantity * latestPrice;
      const newDividends = (existing.dividends || 0) + (dividends ? parseFloat(dividends) : 0);

      const investment = await prisma.investment.update({
        where: { id: existing.id },
        data: {
          investedAmount: newInvestedAmount,
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          lastPricePerUnit: latestPrice,
          currentValue: newCurrentValue,
          dividends: newDividends,
          date: date ? new Date(date) : new Date(),
        },
      });

      await prisma.investmentPurchase.create({
        data: {
          investmentId: investment.id,
          quantity: parseFloat(quantity),
          pricePerUnit: parseFloat(investedAmount) / parseFloat(quantity),
          totalAmount: parseFloat(investedAmount),
          date: date ? new Date(date) : new Date(),
        }
      });

      return res.json(investment);
    } else {
      // Create new
      const investment = await prisma.investment.create({
        data: {
          name,
          category,
          investedAmount: parseFloat(investedAmount),
          currentValue: parseFloat(currentValue),
          dividends: dividends ? parseFloat(dividends) : 0,
          quantity: parseFloat(quantity),
          unitType,
          averagePrice: parseFloat(averagePrice),
          lastPricePerUnit: parseFloat(lastPricePerUnit),
          date: date ? new Date(date) : new Date(),
        },
      });

      await prisma.investmentPurchase.create({
        data: {
          investmentId: investment.id,
          quantity: parseFloat(quantity),
          pricePerUnit: parseFloat(investedAmount) / parseFloat(quantity),
          totalAmount: parseFloat(investedAmount),
          date: date ? new Date(date) : new Date(),
        }
      });

      return res.json(investment);
    }
  } catch (error) {
    console.error("Failed to add investment:", error);
    res.status(500).json({ error: 'Failed to add investment' });
  }
});

app.put('/api/investments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, investedAmount, currentValue, dividends, date, quantity, unitType, averagePrice, lastPricePerUnit } = req.body;
    const investment = await prisma.investment.update({
      where: { id },
      data: {
        name,
        category,
        investedAmount: parseFloat(investedAmount),
        currentValue: parseFloat(currentValue),
        dividends: dividends ? parseFloat(dividends) : 0,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        unitType,
        averagePrice: averagePrice !== undefined ? parseFloat(averagePrice) : undefined,
        lastPricePerUnit: lastPricePerUnit !== undefined ? parseFloat(lastPricePerUnit) : undefined,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.json(investment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

app.delete('/api/investments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.investment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

app.put('/api/investment-purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, pricePerUnit, date } = req.body;
    
    // Update the purchase
    const updatedPurchase = await prisma.investmentPurchase.update({
      where: { id },
      data: {
        quantity: parseFloat(quantity),
        pricePerUnit: parseFloat(pricePerUnit),
        totalAmount: parseFloat(quantity) * parseFloat(pricePerUnit),
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate parent investment
    const allPurchases = await prisma.investmentPurchase.findMany({
      where: { investmentId: updatedPurchase.investmentId }
    });

    let totalQty = 0;
    let totalInvested = 0;

    allPurchases.forEach(p => {
      totalQty += p.quantity;
      totalInvested += p.totalAmount;
    });

    const averagePrice = totalQty > 0 ? totalInvested / totalQty : 0;

    // Get parent to calculate current value based on last price
    const parent = await prisma.investment.findUnique({ where: { id: updatedPurchase.investmentId } });
    const currentValue = totalQty * (parent.lastPricePerUnit || 0);

    const updatedParent = await prisma.investment.update({
      where: { id: updatedPurchase.investmentId },
      data: {
        quantity: totalQty,
        investedAmount: totalInvested,
        averagePrice: averagePrice,
        currentValue: currentValue
      }
    });

    res.json(updatedPurchase);
  } catch (error) {
    console.error("Failed to update purchase:", error);
    res.status(500).json({ error: 'Failed to update investment purchase' });
  }
});

app.delete('/api/investment-purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchase = await prisma.investmentPurchase.findUnique({ where: { id } });
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    await prisma.investmentPurchase.delete({ where: { id } });

    const allPurchases = await prisma.investmentPurchase.findMany({
      where: { investmentId: purchase.investmentId }
    });

    let totalQty = 0;
    let totalInvested = 0;

    allPurchases.forEach(p => {
      totalQty += p.quantity;
      totalInvested += p.totalAmount;
    });

    const averagePrice = totalQty > 0 ? totalInvested / totalQty : 0;

    const parent = await prisma.investment.findUnique({ where: { id: purchase.investmentId } });
    const currentValue = totalQty * (parent.lastPricePerUnit || 0);

    const updatedParent = await prisma.investment.update({
      where: { id: purchase.investmentId },
      data: {
        quantity: totalQty,
        investedAmount: totalInvested,
        averagePrice: averagePrice,
        currentValue: currentValue
      }
    });

    res.json({ success: true, updatedParent });
  } catch (error) {
    console.error("Failed to delete purchase:", error);
    res.status(500).json({ error: 'Failed to delete investment purchase' });
  }
});

// --- INVESTMENT DIVIDENDS ---

app.post('/api/investment-dividends', async (req, res) => {
  try {
    const { investmentId, amount, date } = req.body;
    
    const dividend = await prisma.investmentDividend.create({
      data: {
        investmentId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate parent investment total dividends
    const allDividends = await prisma.investmentDividend.findMany({
      where: { investmentId }
    });
    
    let totalDividends = 0;
    allDividends.forEach(d => totalDividends += d.amount);

    const updatedParent = await prisma.investment.update({
      where: { id: investmentId },
      data: { dividends: totalDividends }
    });

    res.json(dividend);
  } catch (error) {
    console.error("Failed to add dividend:", error);
    res.status(500).json({ error: 'Failed to add investment dividend' });
  }
});

app.put('/api/investment-dividends/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date } = req.body;
    
    const updatedDividend = await prisma.investmentDividend.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate parent
    const allDividends = await prisma.investmentDividend.findMany({
      where: { investmentId: updatedDividend.investmentId }
    });
    
    let totalDividends = 0;
    allDividends.forEach(d => totalDividends += d.amount);

    const updatedParent = await prisma.investment.update({
      where: { id: updatedDividend.investmentId },
      data: { dividends: totalDividends }
    });

    res.json(updatedDividend);
  } catch (error) {
    console.error("Failed to update dividend:", error);
    res.status(500).json({ error: 'Failed to update investment dividend' });
  }
});

app.delete('/api/investment-dividends/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const dividend = await prisma.investmentDividend.findUnique({ where: { id } });
    if (!dividend) {
      return res.status(404).json({ error: 'Dividend not found' });
    }

    await prisma.investmentDividend.delete({ where: { id } });

    // Recalculate parent
    const allDividends = await prisma.investmentDividend.findMany({
      where: { investmentId: dividend.investmentId }
    });
    
    let totalDividends = 0;
    allDividends.forEach(d => totalDividends += d.amount);

    const updatedParent = await prisma.investment.update({
      where: { id: dividend.investmentId },
      data: { dividends: totalDividends }
    });

    res.json({ success: true, updatedParent });
  } catch (error) {
    console.error("Failed to delete dividend:", error);
    res.status(500).json({ error: 'Failed to delete investment dividend' });
  }
});

// --- SUMMARY ---

app.get('/api/summary', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();
    const investments = await prisma.investment.findMany();
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDividends = 0;

    investments.forEach((inv) => {
      totalInvested += inv.investedAmount;
      totalCurrentValue += inv.currentValue;
      totalDividends += (inv.dividends || 0);
    });

    const balance = totalIncome - totalExpense;
    // Gabungan Aset = Saldo + (Current Value + Dividends)
    const gabunganAset = totalCurrentValue + balance + totalDividends; 

    res.json({
      totalIncome,
      totalExpense,
      balance,
      totalInvested,
      totalInvestmentValue: totalCurrentValue,
      totalDividends,
      totalAssets: gabunganAset,
      gabunganAset,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// --- MONTHLY REPORTS ---

app.get('/api/monthly-reports', async (req, res) => {
  try {
    const reports = await prisma.monthlyReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/monthly-reports', async (req, res) => {
  try {
    const { month, totalAssets, totalIncome, totalExpense, investmentValue, aiAnalysis } = req.body;
    
    // Check if month already exists, update if yes
    const existing = await prisma.monthlyReport.findFirst({
      where: { month }
    });

    if (existing) {
      const updated = await prisma.monthlyReport.update({
        where: { id: existing.id },
        data: { totalAssets, totalIncome, totalExpense, investmentValue, aiAnalysis }
      });
      return res.json(updated);
    }

    const report = await prisma.monthlyReport.create({
      data: {
        month,
        totalAssets,
        totalIncome,
        totalExpense,
        investmentValue,
        aiAnalysis
      }
    });
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save monthly report' });
  }
});

app.put('/api/monthly-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { aiAnalysis } = req.body;
    
    const updated = await prisma.monthlyReport.update({
      where: { id },
      data: { aiAnalysis }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

app.delete('/api/monthly-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.monthlyReport.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// --- AI PRICE LOOKUP ---

app.post('/api/ai/get-price', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Gunakan alat Google Search SEKARANG JUGA untuk mencari harga pasar REAL-TIME TERBARU HARI INI (${today}) untuk aset investasi: "${name}" (kategori: "${category}") di Indonesia.
    
    ATURAN SANGAT KETAT:
    1. Anda TIDAK BOLEH menebak atau menggunakan data histori dari ingatan Anda. Anda WAJIB mengambil data dari hasil pencarian (seperti Google Finance, Yahoo Finance, atau IDX).
    2. Jika saham (misalnya BBRI), cari secara spesifik "Harga saham ${name} hari ini" atau "BBRI.JK stock price". Pastikan Anda mengembalikan harga per lembar HARI INI di Bursa Efek Indonesia.
    3. Kembalikan HANYA ANGKA harganya saja, lalu bungkus dengan tag <price> dan </price>. JANGAN tambahkan teks penjelasan apapun di luar tag ini.
    4. Contoh format sukses: <price>3070</price> (jika harga Rp 3.070), <price>5000</price> (jika harga Rp 5.000).`;

    let response;
    try {
      response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          tools: [{ googleSearch: {} }],
      });
    } catch (fallbackError) {
      console.warn("Gemini 3 Flash Preview failed (High Demand/Limit). Falling back to Gemini 2.5 Flash...");
      response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          tools: [{ googleSearch: {} }],
      });
    }

    const priceText = response.text || "";
    console.log("AI Raw Response:", priceText);

    let priceStr = "";
    const match = priceText.match(/<price>([0-9\.,\s]+)<\/price>/i);
    
    if (match) {
        priceStr = match[1].replace(/[^0-9]/g, '');
    } else {
        const numbers = priceText.match(/\d{3,}/g);
        if (numbers && numbers.length > 0) {
            priceStr = numbers[numbers.length - 1];
        } else {
            priceStr = priceText.replace(/[^0-9]/g, '');
        }
    }

    let price = parseFloat(priceStr);

    if (isNaN(price) || priceStr === "") {
      throw new Error("Could not parse price from AI response");
    }

    res.json({ price });
  } catch (error) {
    console.error("AI Price Fetch Error:", error);
    res.status(500).json({ error: 'Failed to fetch price from AI' });
  }
});

// --- AI ADVISOR ---

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
    const investments = await prisma.investment.findMany({ orderBy: { date: 'desc' } });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    const investmentBreakdown = {};
    let totalInvested = 0;
    let totalCurrentValue = 0;

    investments.forEach((inv) => {
      totalInvested += inv.investedAmount;
      totalCurrentValue += inv.currentValue;
      if (!investmentBreakdown[inv.category]) {
        investmentBreakdown[inv.category] = { invested: 0, current: 0 };
      }
      investmentBreakdown[inv.category].invested += inv.investedAmount;
      investmentBreakdown[inv.category].current += inv.currentValue;
    });

    const prompt = `
      Anda adalah penasihat keuangan pribadi kelas dunia yang cerdas, profesional, dan tajam dalam memberikan saran.
      Berikut adalah ringkasan keuangan saya saat ini:
      
      [ARUS KAS]
      - Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
      - Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
      - Sisa Kas (Saldo): Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}
      
      Rincian pengeluaran berdasarkan kategori:
      ${Object.entries(categoryBreakdown).map(([cat, amount]) => `- ${cat}: Rp ${amount.toLocaleString('id-ID')}`).join('\n')}

      [PORTOFOLIO INVESTASI]
      - Total Modal Diinvestasikan: Rp ${totalInvested.toLocaleString('id-ID')}
      - Nilai Aset Investasi Saat Ini: Rp ${totalCurrentValue.toLocaleString('id-ID')}
      - Return / Keuntungan: Rp ${(totalCurrentValue - totalInvested).toLocaleString('id-ID')}

      Rincian investasi berdasarkan kelas aset:
      ${Object.entries(investmentBreakdown).map(([cat, val]) => `- ${cat}: Modal Rp ${val.invested.toLocaleString('id-ID')} -> Nilai Saat Ini Rp ${val.current.toLocaleString('id-ID')}`).join('\n')}

      Berikan saya:
      1. Evaluasi arus kas saat ini (apakah sehat/perlu perbaikan) dan strategi menekan pengeluaran.
      2. Evaluasi komposisi portofolio aset saat ini (diversifikasi, manajemen risiko).
      3. Saran investasi ke depan dan peluang pasar terkini berdasarkan profil kelas aset di atas (gunakan analisis data berita dan tren terkini).
      
      Gunakan bahasa yang profesional namun ringkas dan mudah dimengerti, dengan format yang rapi (menggunakan bullet points, bold text). Hindari pengantar panjang lebar.
    `;

    let response;
    try {
      response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
      });
    } catch (fallbackError) {
      console.warn("Gemini 3 Flash Preview failed. Falling back to Gemini 2.5 Flash...");
      response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
      });
    }

    res.json({ analysis: response.text });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: 'Failed to generate AI analysis' });
  }
});

// --- CRON JOBS ---

app.get('/api/cron/monthly-report', async (req, res) => {
  // Optional: check CRON_SECRET if configured in Vercel
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
    const investments = await prisma.investment.findMany({ orderBy: { date: 'desc' } });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    const investmentBreakdown = {};
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDividends = 0;

    investments.forEach((inv) => {
      totalInvested += inv.investedAmount;
      totalCurrentValue += inv.currentValue;
      totalDividends += (inv.dividends || 0);
      if (!investmentBreakdown[inv.category]) {
        investmentBreakdown[inv.category] = { invested: 0, current: 0 };
      }
      investmentBreakdown[inv.category].invested += inv.investedAmount;
      investmentBreakdown[inv.category].current += inv.currentValue;
    });

    const balance = totalIncome - totalExpense;
    const gabunganAset = totalCurrentValue + balance + totalDividends;

    const prompt = `
      Anda adalah penasihat keuangan pribadi kelas dunia yang cerdas, profesional, dan tajam dalam memberikan saran.
      Berikut adalah ringkasan keuangan saya saat ini:
      
      [ARUS KAS]
      - Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
      - Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
      - Sisa Kas (Saldo): Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}
      
      Rincian pengeluaran berdasarkan kategori:
      ${Object.entries(categoryBreakdown).map(([cat, amount]) => `- ${cat}: Rp ${amount.toLocaleString('id-ID')}`).join('\n')}

      [PORTOFOLIO INVESTASI]
      - Total Modal Diinvestasikan: Rp ${totalInvested.toLocaleString('id-ID')}
      - Nilai Aset Investasi Saat Ini: Rp ${totalCurrentValue.toLocaleString('id-ID')}
      - Return / Keuntungan: Rp ${(totalCurrentValue - totalInvested).toLocaleString('id-ID')}

      Rincian investasi berdasarkan kelas aset:
      ${Object.entries(investmentBreakdown).map(([cat, val]) => `- ${cat}: Modal Rp ${val.invested.toLocaleString('id-ID')} -> Nilai Saat Ini Rp ${val.current.toLocaleString('id-ID')}`).join('\n')}

      Berikan saya:
      1. Evaluasi arus kas saat ini (apakah sehat/perlu perbaikan) dan strategi menekan pengeluaran.
      2. Evaluasi komposisi portofolio aset saat ini (diversifikasi, manajemen risiko).
      3. Saran investasi ke depan dan peluang pasar terkini berdasarkan profil kelas aset di atas (gunakan analisis data berita dan tren terkini).
      
      Gunakan bahasa yang profesional namun ringkas dan mudah dimengerti, dengan format yang rapi (menggunakan bullet points, bold text). Hindari pengantar panjang lebar.
    `;

    let response;
    try {
      response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
      });
    } catch (fallbackError) {
      response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
      });
    }

    const aiAnalysis = response.text;
    const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
    const currentMonthStr = monthFormatter.format(new Date());

    const existing = await prisma.monthlyReport.findFirst({
      where: { month: currentMonthStr }
    });

    if (existing) {
      await prisma.monthlyReport.update({
        where: { id: existing.id },
        data: { totalAssets: gabunganAset, totalIncome, totalExpense, investmentValue: totalCurrentValue, aiAnalysis }
      });
    } else {
      await prisma.monthlyReport.create({
        data: {
          month: currentMonthStr,
          totalAssets: gabunganAset,
          totalIncome,
          totalExpense,
          investmentValue: totalCurrentValue,
          aiAnalysis
        }
      });
    }

    res.json({ success: true, month: currentMonthStr });
  } catch (error) {
    console.error("Cron Job Error:", error);
    res.status(500).json({ error: 'Failed to generate monthly report cron' });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
