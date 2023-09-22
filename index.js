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

    const Results = {
        weekly: DataWeekly,
        totalWeekly: DataWeekly.Monday + DataWeekly.Tuesday +
            DataWeekly.Wednesday + DataWeekly.Thursday + DataWeekly.Friday + DataWeekly.Saturday + DataWeekly.Sunday
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
