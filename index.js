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
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

function authorizeToken(req, res, next) {
    const token = req.headers.authorization.split(' ')[1];
    console.log(token)
    if (!token) {
        return res.status(403).json({ message: 'Tidak ada token tersedia' });
    }

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

    // const tanggal = new Date().toISOString().split('T')[0];
    // const startDate = new Date(`${tanggal}T00:00:00.000Z`);
    // const endDate = new Date(`${tanggal}T23:59:59.000Z`);
    // console.log(startDate, 'startdate && ', endDate, 'enbdate');
    // const HistoryOrder = connection.historyStorage.getHistoryOrdersByTimeRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
    const HistoryDeal = connection.historyStorage.getDealsByTimeRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
    const ProfitDay = HistoryDeal?.reduce((a, b) => a + b.profit, 0);
    const Position = terminalState.positions

    const result = {
        Account: Account,
        ProfitDay: ProfitDay,
        Position: Position
    }
    res.json({ result: result });
});


app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
