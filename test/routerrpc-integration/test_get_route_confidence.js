const {once} = require('events');

const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {delay} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {getRouteConfidence} = require('./../../');
const {getRoutes} = require('./../../');
const {openChannel} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {payViaRoutes} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');
const {waitForRoute} = require('./../macros');

const chain = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206';
const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const tokens = 1e6 / 2;

// Getting route confidence should return confidence in a route
test('Get route confidence', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  // Create a channel from the control to the target node
  await setupChannel({
    lnd,
    capacity: channelCapacityTokens * 2,
    generate: cluster.generate,
    to: cluster.target,
  });

  await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: Math.round(channelCapacityTokens / 2),
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({
    lnd,
    public_key: cluster.remote.public_key,
    socket: cluster.remote.socket
  });

  const destination = cluster.remote.public_key;

  // Allow time for graph sync to complete
  await waitForRoute({destination, lnd, tokens});

  try {
    await probeForRoute({
      destination,
      lnd,
      tokens,
      is_ignoring_past_failures: true,
    });
  } catch (err) {}

  const {nodes} = await getForwardingReputations({lnd});

  // LND 0.7.1 does not have nodes reputation
  if (!!nodes.length) {
    const {routes} = await getRoutes({destination, lnd, tokens});

    equal(routes.length, 1, 'There should be a route');

    if (!!routes.length) {
      const [{hops}] = routes;

      const odds = (await getRouteConfidence({lnd, hops})).confidence;

      equal((odds / 1e6) < 0.1, true, 'Due to fail, odds of success are low');
    }
  }

  await cluster.kill({});

  return end();
});
