import { createLibp2p } from 'libp2p'
import { multiaddr } from 'multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import express from 'express'
import LevelUp from 'levelup'
import MemDOWN from 'memdown'

const TOPIC = 'p2p-cache'

const db = new LevelUp(MemDOWN())
const app = express()
app.use(express.json()) // for parsing application/json

// usage: node src/main.js <rpc-port> <peer-multiaddr>
const httpPort = process.argv[2]
// optional
const peerMultiaddr = process.argv[3]

const peers = []
if (peerMultiaddr) {
  const addr = multiaddr(peerMultiaddr)
  const id = peerIdFromString(addr.getPeerId())
  peers.push({id: id, addrs: [addr]})
}

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()],
    services: {
      // we add the Pubsub module we want
      pubsub: gossipsub({
        allowPublishToZeroPeers: true,
        awaitRpcMessageHandler: true,
        directPeers: peers
      })
    }
  })

  return node
}

const node = await createNode()

node.addEventListener('error', (err) => {
    console.error('p2p error:', err)
});

console.log('Node running with Peer ID: ', node.peerId, node.getMultiaddrs(), ' Press CTRL+C to stop.')

// GET endpoint to fetch a value from the cache by key
app.get('/cache/:key', async (req, res) => {
  try {
    const value = await get(req.params.key);
    if (value) {
      res.json({ key: req.params.key, value: value });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint to set a value in the cache
app.post('/cache', async (req, res) => {
  try {
    const key = req.body.key
    const value = req.body.value

    if (!key || !value) {
      return res.status(400).json({ error: 'Both key and value are required' })
    }

    await set(key, value);
    res.json({ message: 'Value set successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
});

async function get(key) {
  try {
    return await db.get(key, { asBuffer: false })
  } catch (err) {
    if (err.type === 'NotFoundError') {
      // If not found in cache, request data from the network
      node.services.pubsub.publish(TOPIC, new TextEncoder().encode(JSON.stringify({
        action: 'GET',
        key: key
      })))

      // Give some time for other peers to respond
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check cache again after delay
      return await db.get(key, { asBuffer: false })
    } else {
      console.error('Failed to retrieve data from LevelDB', err)
    }
  }
}

async function set(key, value) {
  try {
    await db.put(key, value)
  } catch (err) {
    console.error('Failed to set data in LevelDB', err)
  }
}

// Listen for messages
node.services.pubsub.addEventListener("message", async (message) => {
  const data = JSON.parse(new TextDecoder().decode(message.detail.data))

  if (data.action === 'GET') {
    try {
      const value = await db.get(data.key, { asBuffer: false })
      // If we have the requested data in cache, send it
      node.services.pubsub.publish(TOPIC, new TextEncoder().encode(JSON.stringify({
        action: 'SET',
        key: data.key,
        value: value
      })))
    } catch (err) {
      if (!err.type === 'NotFoundError') {
        console.error(err)
      }
    }
  } else if (data.action === 'SET') {
    // Update our cache with the received data
    await set(data.key, data.value)
  }
});

node.services.pubsub.subscribe(TOPIC)

// Start the Express server
app.listen(httpPort, () => {
  console.log(`REST API server started at http://localhost:${httpPort}`)
});

await db.open()
await node.start()
