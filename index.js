const express = require('express');
const MetaApi = require('metaapi.cloud-sdk').default;
const jwt = require('jsonwebtoken');
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 4000;
const secretKey = process.env.SECRETKEY

const token = process.env.TOKEN
const accountId = process.env.ACCOUNT_ID
const api = new MetaApi(token);

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

function authorizeToken(req, res, next) {
    if (!req.headers.authorization) {
        return res.status(403).json({ message: 'Tidak ada token tersedia' });
    }

    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token tidak valid' });
        }
        req.user = user;
        next();
    });
}

app.post('/login', (req, res) => {
    const { username } = req.body;

    if (username === process.env.USER) {
        const token = jwt.sign({ username }, secretKey);
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Gagal login' });
    }
});

app.get('/', authorizeToken, async (req, res) => {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getStreamingConnection();
    await connection.connect();
    const terminalState = connection.terminalState;
    await connection.waitSynchronized();
    const Account = {
        name: terminalState.accountInformation.name,
        server: terminalState.accountInformation.server,
        balance: terminalState.accountInformation.balance,
        equity: terminalState.accountInformation.equity,
        currency: terminalState.accountInformation.currency
    }

    const HistoryDeal = connection.historyStorage.getDealsByTimeRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
    const ProfitDay = HistoryDeal?.reduce((a, b) => a + b.profit, 0);
    const Position = terminalState.positions

    const result = {
        Account: Account,
        ProfitDay: ProfitDay,
        Position: Position
    }
    res.status(200).json({ result: result });
});


app.get('/history', authorizeToken, async (req, res) => {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getStreamingConnection();
    await connection.connect();
    const terminalState = connection.terminalState;
    await connection.waitSynchronized();
    // Weekly Transaction
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Satu minggu yang lalu
    const historyWeek = connection.historyStorage.getDealsByTimeRange(oneWeekAgo, new Date());
    const weeklyProfit = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
    };

    historyWeek.forEach((result) => {
        const dealTime = new Date(result.brokerTime);
        const options = { weekday: 'long' };
        const dayName = dealTime.toLocaleDateString('en-US', options);
        weeklyProfit[dayName] += result.profit;
    });

    const DataWeekly = {
        Monday: parseFloat(weeklyProfit.Monday.toFixed(2)),
        Tuesday: parseFloat(weeklyProfit.Tuesday.toFixed(2)),
        Wednesday: parseFloat(weeklyProfit.Wednesday.toFixed(2)),
        Thursday: parseFloat(weeklyProfit.Thursday.toFixed(2)),
        Friday: parseFloat(weeklyProfit.Friday.toFixed(2)),
        Saturday: parseFloat(weeklyProfit.Saturday.toFixed(2)),
        Sunday: parseFloat(weeklyProfit.Sunday.toFixed(2)),
    }

    // Month Transaction
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const historyMonth = connection.historyStorage.getDealsByTimeRange(firstDayOfMonth, today);

    const MonthProfit = {
        week1: 0,
        week2: 0,
        week3: 0,
        week4: 0,
    };

    historyMonth.forEach((historyMonth) => {
        const dealDate = historyMonth.time;
        const dealWeek = Math.ceil(dealDate.getDate() / 7);
        MonthProfit[`week${dealWeek}`] += historyMonth.profit;
    });

    const DataMonth = {
        week1: parseFloat(MonthProfit.week1.toFixed(2)),
        week2: parseFloat(MonthProfit.week2.toFixed(2)),
        week3: parseFloat(MonthProfit.week3.toFixed(2)),
        week4: parseFloat(MonthProfit.week4.toFixed(2)),
    }

    // Year Transaction
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1); // Bulan dimulai dari 0 (Januari)
    const historyYear = connection.historyStorage.getDealsByTimeRange(firstDayOfYear, today);

    const monthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
    ];
    const YearProfit = {
        january: 0,
        february: 0,
        march: 0,
        april: 0,
        may: 0,
        june: 0,
        july: 0,
        august: 0,
        september: 0,
        october: 0,
        november: 0,
        december: 0,
    };

    historyYear.forEach((history) => {
        const dealDate = new Date(history.time);
        const monthIndex = dealDate.getMonth();
        const monthName = monthNames[monthIndex];
        YearProfit[monthName] += history.profit;
    });

    const DataYears = {
        january: parseFloat(YearProfit.january.toFixed(2)),
        february: parseFloat(YearProfit.february.toFixed(2)),
        march: parseFloat(YearProfit.march.toFixed(2)),
        april: parseFloat(YearProfit.april.toFixed(2)),
        may: parseFloat(YearProfit.may.toFixed(2)),
        june: parseFloat(YearProfit.june.toFixed(2)),
        july: parseFloat(YearProfit.july.toFixed(2)),
        august: parseFloat(YearProfit.august.toFixed(2)),
        september: parseFloat(YearProfit.september.toFixed(2)),
        october: parseFloat(YearProfit.october.toFixed(2)),
        november: parseFloat(YearProfit.november.toFixed(2)),
        december: parseFloat(YearProfit.december.toFixed(2)),
    };

    const Results = {
        weekly: DataWeekly,
        totalWeekly: DataWeekly.Monday + DataWeekly.Tuesday +
            DataWeekly.Wednesday + DataWeekly.Thursday + DataWeekly.Friday + DataWeekly.Saturday + DataWeekly.Sunday,
        oneMonth: DataMonth,
        totalOneMonth: DataMonth.week1 + DataMonth.week2 + DataMonth.week3 + DataMonth.week4,
        Year: DataYears,
        totalYear:
            DataYears.january +
            DataYears.february +
            DataYears.march +
            DataYears.april +
            DataYears.may +
            DataYears.june +
            DataYears.july +
            DataYears.august +
            DataYears.september +
            DataYears.october +
            DataYears.november +
            DataYears.december
    }

    res.status(200).json({ result: Results });
});

app.post('/closeposition', authorizeToken, async (req, res) => {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getStreamingConnection();
    await connection.connect();
    const terminalState = connection.terminalState;
    await connection.waitSynchronized();
    const position = terminalState.positions?.map(get => { return get.id })

    const { position_id } = req.body;
    if (!position_id) return res.status(403).json({ message: 'ID Position Tidak Ada!' });
    if (!position.includes(position_id)) {
        return res.status(401).json({ message: 'Gagal Close Position ID Tidak Valid!' });

    } else {
        await connection.closePosition(position_id)
        return res.status(201).json({ message: `Close Position Success ${position_id}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
