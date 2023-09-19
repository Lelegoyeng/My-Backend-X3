const MetaApi = require('metaapi.cloud-sdk').default;
require('dotenv').config();

const token = process.env.TOKEN
const accountId = process.env.ACCOUNT_ID
const api = new MetaApi(token);

async function position() {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getStreamingConnection();
    await connection.connect();
    const terminalState = connection.terminalState;
    await connection.waitSynchronized();
    const position = terminalState.positions
    console.log(position)
}


position();