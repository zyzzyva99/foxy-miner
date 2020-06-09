// Adapted from foxy-proxy's lib/upstream/util.js
const JSONbig = require('json-bigint');
const superagent = require('superagent');

async function doBitcoinApiCall(url, method, params = []) {
  const res = await superagent.post(url).unset('User-Agent').send({
    jsonrpc: '2.0',
    id: 0,
    method,
    params,
  });

  return JSONbig.parse(res.res.text).result;
}

async function doBurstApiCall(url, method, params = {}, endpoint = 'burst') {
  const queryParams = {
    requestType: method,
  };
  Object.keys(params).forEach(key => {
    queryParams[key] = params[key];
  });
  const {text: result} = await superagent.get(`${url}/${endpoint}`).query(queryParams).unset('User-Agent');

  return JSON.parse(result);
}

async function getBlockWinnerAccountId(url, isBitcoinLike, height, customEndpoint = 'burst') {
  let accountId = await getBlockWinnerAccountIdOrNull(url, isBitcoinLike, height, customEndpoint);
  let retries = 0;
  while (accountId === null && retries < 24) {
    await new Promise(resolve => setTimeout(resolve, 5 * 1000));
    accountId = await getBlockWinnerAccountIdOrNull(url, isBitcoinLike, height, customEndpoint);
    retries += 1;
  }

  return accountId;
}

async function getBlockWinnerAccountIdOrNull(url, isBitcoinLike, height, customEndpoint = 'burst') {
  try {
    if (isBitcoinLike) {
        const blockHash = await doBitcoinApiCall(url, 'getblockhash', [height]);
        const block = await doBitcoinApiCall(url, 'getblock', [blockHash], true);

        return block.plotterId.toString();
    } else {
      const block = await doBurstApiCall(url, 'getBlock', {height}, customEndpoint);

      if (!block.generator) {
        return null;
      }

      return block.generator;
    }
  } catch (err) {
    return null;
  }
}

module.exports = {
  getBlockWinnerAccountId,
};
