const MetaApi = require('metaapi.cloud-sdk').default;
require('dotenv').config();

const token = process.env.TOKEN
const accountId = process.env.ACCOUNT_ID
const api = new MetaApi(token);

async function order() {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getStreamingConnection();
    await connection.connect();
    const terminalState = connection.terminalState;
    await connection.waitSynchronized();
    const position = terminalState.positions.filter(f => f.symbol === 'EURUSD');
    await connection.subscribeToMarketData('EURUSD');
    const PriceNow = terminalState.price('EURUSD');
    // console.log('BUY')
    // const TP = PriceNow.bid + (PriceNow.bid * 0.00100) // 100 pip
    // const SL = PriceNow.ask - (PriceNow.ask * 0.00100) // 100 pip
    // const roundedNumberTP = Math.ceil(TP * 100000) / 100000;
    // const roundedNumberSL = Math.ceil(SL * 100000) / 100000;
    // await connection.createMarketBuyOrder('EURUSD', 0.4, roundedNumberSL, roundedNumberTP, { comment: 'buy', clientId: 'TE_EURUSD_7hyINWqAl' });
    console.log('SELL')
    const TP = PriceNow.ask - (PriceNow.ask * 0.00100) // 100 pip
    const SL = PriceNow.bid + (PriceNow.bid * 0.00100) // 100 pip
    const roundedNumberTP = Math.ceil(TP * 100000) / 100000;
    const roundedNumberSL = Math.ceil(SL * 100000) / 100000;
    await connection.createMarketSellOrder('EURUSD', 0.4, roundedNumberSL, roundedNumberTP, { comment: 'sell', clientId: 'TE_EURUSD_7hyINWqAl' });

}


order();