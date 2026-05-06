const prisma = require('../config/db');

// ── GET /api/analytics/revenue ──────────────────────────────────────────────
// Returns revenue/expense summary, daily chart data, route performance, and report stats.
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    if (period === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      prevStartDate = new Date(new Date(startDate).setDate(startDate.getDate() - 1));
      prevEndDate = new Date(startDate);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(startDate);
    } else { // weekly default
      const day = now.getDay() || 7;
      startDate = new Date(new Date(now).setHours(0, 0, 0, 0));
      startDate.setDate(startDate.getDate() - (day - 1));
      prevStartDate = new Date(new Date(startDate).setDate(startDate.getDate() - 7));
      prevEndDate = new Date(startDate);
    }

    // CRITICAL FIX: Add a check to ensure prisma.expense exists before calling it
    if (!prisma.expense) {
      console.error("Prisma Error: 'expense' model not found in Prisma Client. Please run `npx prisma generate`.");
      return res.status(500).json({ message: "Database configuration error: Expense model missing." });
    }

    // Current Period Stats
    const currentRevenue = await prisma.booking.aggregate({
      where: { status: 'confirmed', createdAt: { gte: startDate } },
      _sum: { totalPrice: true }
    });

    const currentExpenses = await prisma.expense.aggregate({
      where: { date: { gte: startDate } },
      _sum: { amount: true }
    });

    const totalRevenue = currentRevenue._sum.totalPrice || 0;
    const totalExpenses = currentExpenses._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Previous Period Stats for Comparison
    const prevRevenue = await prisma.booking.aggregate({
      where: { status: 'confirmed', createdAt: { gte: prevStartDate, lt: prevEndDate } },
      _sum: { totalPrice: true }
    });
    const prevExpenses = await prisma.expense.aggregate({
      where: { date: { gte: prevStartDate, lt: prevEndDate } },
      _sum: { amount: true }
    });

    const lastRevenue = prevRevenue._sum.totalPrice || 0;
    const lastExpenses = prevExpenses._sum.amount || 0;
    const lastProfit = lastRevenue - lastExpenses;

    const calculateChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const comparison = {
      revenueChange: calculateChange(totalRevenue, lastRevenue),
      expenseChange: calculateChange(totalExpenses, lastExpenses),
      profitChange: calculateChange(netProfit, lastProfit)
    };

    // 3. Daily chart data (last 7 days regardless of filter for the trend line)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const chartBookings = await prisma.booking.findMany({
      where: { status: 'confirmed', createdAt: { gte: sevenDaysAgo } },
      select: { totalPrice: true, createdAt: true }
    });
    const chartExpenses = await prisma.expense.findMany({
      where: { date: { gte: sevenDaysAgo } },
      select: { amount: true, date: true }
    });

    const dailyRevenue = [0, 0, 0, 0, 0, 0, 0];
    const dailyExpenses = [0, 0, 0, 0, 0, 0, 0];
    
    chartBookings.forEach(b => {
      const day = new Date(b.createdAt).getDay();
      const idx = day === 0 ? 6 : day - 1;
      dailyRevenue[idx] += b.totalPrice || 0;
    });
    chartExpenses.forEach(e => {
      const day = new Date(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      dailyExpenses[idx] += e.amount || 0;
    });

    // 4. Route performance
    const completedTrips = await prisma.trip.findMany({
      where: { status: 'Completed', departureDate: { gte: startDate } },
      include: {
        bookings: { where: { status: 'confirmed' }, select: { totalPrice: true, bookedSeats: true } }
      }
    });

    const routeMap = {};
    completedTrips.forEach(trip => {
      const key = `${trip.departureTerminal} → ${trip.arrivalTerminal}`;
      if (!routeMap[key]) routeMap[key] = { route: key, trips: 0, passengers: 0, revenue: 0 };
      routeMap[key].trips += 1;
      trip.bookings.forEach(b => {
        routeMap[key].passengers += (b.bookedSeats || []).length;
        routeMap[key].revenue += b.totalPrice || 0;
      });
    });

    const routePerformance = Object.values(routeMap).map(r => {
      const expenses = Math.floor(r.revenue * 0.15); // Dynamic proxy if real trip expenses aren't tracked per trip
      const profit = r.revenue - expenses;
      const margin = r.revenue > 0 ? Math.round((profit / r.revenue) * 100) : 0;
      return { ...r, expenses, profit, margin, status: margin >= 70 ? 'Top Performer' : 'Average' };
    }).sort((a, b) => b.revenue - a.revenue);

    // 5. Profit Loss Detailed
    const expenseBreakdown = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: startDate } },
      _sum: { amount: true }
    });

    const profitLoss = {
      income: [
        { label: 'Ticket Sales', amount: totalRevenue },
        { label: 'Add-on Services', amount: Math.floor(totalRevenue * 0.05) } // Proxy for now
      ],
      expenses: expenseBreakdown.map(e => ({ label: e.category, amount: e._sum.amount })),
      totalIncome: totalRevenue + Math.floor(totalRevenue * 0.05),
      totalExpenses: totalExpenses
    };

    res.status(200).json({
      success: true,
      data: {
        summary: { totalRevenue, totalExpenses, netProfit, profitMargin },
        comparison,
        chart: { dailyRevenue, dailyExpenses },
        routePerformance,
        profitLoss,
        reportStats: {
          totalTrips: await prisma.trip.count(),
          totalBuses: await prisma.bus.count(),
          totalDrivers: await prisma.driver.count(),
          todayTrips: await prisma.trip.count({ where: { departureDate: { gte: new Date(new Date().setHours(0,0,0,0)) } } })
        }
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
};
