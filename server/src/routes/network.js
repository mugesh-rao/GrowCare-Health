const express = require('express')
const network = require('../services/network')

const router = express.Router()

// GET /api/network/status — this device's identity + whether LAN pairing is on.
router.get('/status', (req, res) => {
  res.json(network.status())
})

// PUT /api/network/status  { enabled?, deviceName? } — toggle pairing / rename this device.
router.put('/status', async (req, res) => {
  try {
    const { enabled, deviceName } = req.body || {}
    if (typeof deviceName === 'string') await network.setDeviceName(deviceName)
    if (typeof enabled === 'boolean') await network.setEnabled(enabled)
    res.json(network.status())
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// GET /api/network/discovered — nearby GrowCare devices seen on the LAN, not yet paired.
router.get('/discovered', async (req, res) => {
  res.json({ devices: await network.listDiscovered() })
})

// GET /api/network/pending — incoming pairing requests awaiting Accept/Decline.
router.get('/pending', async (req, res) => {
  res.json({ requests: await network.listPending() })
})

// GET /api/network/outgoing — invites this device sent, awaiting the other side.
router.get('/outgoing', async (req, res) => {
  res.json({ invites: await network.listOutgoing() })
})

// GET /api/network/paired — devices this one is paired with.
router.get('/paired', async (req, res) => {
  res.json({ devices: await network.listPaired() })
})

// POST /api/network/invite  { deviceId } — send a pairing request to a discovered device.
router.post('/invite', async (req, res) => {
  try {
    const result = await network.invite(req.body?.deviceId)
    res.status(201).json(result)
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// POST /api/network/pending/:id/accept
router.post('/pending/:id/accept', async (req, res) => {
  try {
    res.json(await network.acceptPending(req.params.id))
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// POST /api/network/pending/:id/decline
router.post('/pending/:id/decline', async (req, res) => {
  try {
    res.json(await network.declinePending(req.params.id))
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// DELETE /api/network/paired/:id — revoke a pairing.
router.delete('/paired/:id', async (req, res) => {
  res.json(await network.revokePaired(req.params.id))
})

module.exports = router
