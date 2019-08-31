const {test} = require('tap');

const {ignoreFromRoutingFailure} = require('./../../router');

const makeKey = n => Buffer.alloc(33, n).toString('hex');

const tests = [
  {
    args: {
      public_key: makeKey(),
      reason: 'UnknownPaymentHash',
    },
    description: 'When hops are not provided, an error is thrown',
    expected: {err: new Error('ExpectedArrayOfHopsToDeriveIgnores')},
  },
  {
    args: {
      hops: [{channel: '0x0x0'}],
      public_key: makeKey(),
      reason: 'UnknownPaymentHash',
    },
    description: 'When hops do not contain a public key, an error is thrown',
    expected: {
      err: new Error('ExpectedArrayOfHopsWithChannelsAndKeysToDeriveIgnores'),
    },
  },
  {
    args: {
      hops: [{channel: '0x0x0', public_key: makeKey()}],
      reason: 'UnknownPaymentHash',
    },
    description: 'When a failure public key is absent, an error is thrown',
    expected: {
      err: new Error('ExpectedPublicKeyOfFailureToDeriveIgnores'),
    },
  },
  {
    args: {
      hops: [{channel: '0x0x0', public_key: makeKey()}],
      public_key: makeKey(),
    },
    description: 'When a failure reason is absent, an error is thrown',
    expected: {err: new Error('ExpectedReasonForFailureToDeriveIgnores')},
  },
  {
    args: {
      hops: [{channel: '0x0x0', public_key: makeKey()}],
      public_key: makeKey(),
      reason: 'UnknownPaymentHash',
    },
    description: 'On a successful hit of the final node, nothing is ignored',
    expected: {ignore: []},
  },
  {
    args: {
      hops: [{channel: '0x0x0', public_key: makeKey(1)}],
      public_key: makeKey(),
      reason: 'UnknownNextPeer',
    },
    description: 'Ignore reporting peers when a channel id is not provided',
    expected: {
      ignore: [{reason: 'UnknownNextPeer', to_public_key: makeKey()}],
    },
  },
  {
    args: {
      channel: '2x2x2',
      hops: [
        {channel: '1x1x1', public_key: makeKey(1)},
        {channel: '2x2x2', public_key: makeKey(2)},
      ],
      public_key: makeKey(),
      reason: 'IncorrectCltvExpiry',
    },
    description: 'Ignore the forwarding hop on a CLTV expiry failure',
    expected: {
      ignore: [
        {
          channel: '2x2x2',
          from_public_key: makeKey(1),
          reason: 'IncorrectCltvExpiry',
          to_public_key: makeKey(2),
        },
        {
          reason: 'IncorrectCltvExpiry',
          to_public_key: makeKey(1),
        },
      ],
    },
  },
  {
    args: {
      channel: '2x2x2',
      hops: [
        {channel: '1x1x1', public_key: makeKey(1)},
        {channel: '2x2x2', public_key: makeKey(2)},
      ],
      public_key: makeKey(1),
      reason: 'TemporaryNodeFailure',
    },
    description: 'Ignore a node that reports a temporary node failure',
    expected: {
      ignore: [
        {
          channel: '2x2x2',
          from_public_key: makeKey(1),
          reason: 'TemporaryNodeFailure',
          to_public_key: makeKey(2),
        },
        {
          reason: 'TemporaryNodeFailure',
          to_public_key: makeKey(1),
        },
      ],
    },
  },
  {
    args: {
      channel: '1x1x1',
      hops: [
        {channel: '1x1x1', public_key: makeKey(1)},
        {channel: '2x2x2', public_key: makeKey(2)},
      ],
      public_key: makeKey(1),
      reason: 'UnknownNextPeer',
    },
    description: 'Ignore the next hop on unknown next peer fail',
    expected: {
      ignore: [
        {
          channel: '1x1x1',
          from_public_key: undefined,
          reason: 'UnknownNextPeer',
          to_public_key: makeKey(1),
        },
        {
          channel: '2x2x2',
          from_public_key: makeKey(1),
          reason: 'UnknownNextPeer',
          to_public_key: makeKey(2),
        },
      ],
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepEqual, end, throws}) => {
    if (!!expected.err) {
      throws(() => ignoreFromRoutingFailure(args), expected.err);

      return end();
    }

    const {ignore} = ignoreFromRoutingFailure(args);

    deepEqual(ignore, expected.ignore, 'Failure mapped to ignore');

    return end();
  });
});
