const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
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
      return res.json(investment);
    }
  } catch (error) {
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

// --- AI PRICE LOOKUP ---

app.post('/api/ai/get-price', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Gunakan alat Google Search untuk mencari tahu harga pasar TERBARU HARI INI (${today}) untuk aset investasi dengan nama "${name}" (kategori: "${category}") di pasar Indonesia.
    
    ATURAN PENCARIAN:
    - Jika saham, pastikan itu adalah harga saham terbaru per HARI INI di Bursa Efek Indonesia (BEI/IDX). Cari harga penutupan terakhir atau harga live per 1 lembar saham dalam Rupiah.
    - Jika kripto, cari harga live hari ini dalam Rupiah.
    - Jika emas, cari harga emas batangan (misal Antam) per 1 gram hari ini dalam Rupiah.
    
    PENTING: Hanya kembalikan ANGKA harganya saja (tanpa titik ribuan, koma, huruf, desimal, atau simbol mata uang). Contoh: jika Anda menemukan Rp 3.070, kembalikan 3070. Wajib mengembalikan harga yang PALING BARU dan akurat.`;

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

    let priceStr = response.text.replace(/[^0-9]/g, '');
    let price = parseFloat(priceStr);

    if (isNaN(price)) {
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

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
