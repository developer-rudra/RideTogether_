const express = require('express');
const router = express.Router();
const {
  createRide,
  joinRide,
  getRideDetails,
  getUserRides,
  startRide,
  endRide,
  removeMember
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

// All ride routes require authentication
router.use(protect);

router.post('/', createRide);
router.get('/', getUserRides);
router.post('/join', joinRide);
router.get('/:rideId', getRideDetails);
router.post('/:rideId/start', startRide);
router.post('/:rideId/end', endRide);
router.delete('/:rideId/members/:userId', removeMember);

module.exports = router;
