const express = require('express');
const router = express.Router();
const {
  createFriendGroup,
  getFriendGroups,
  joinFriendGroup,
  getLeaderboard,
  getChallenges,
  joinChallenge,
  logChallengeSavings,
  deleteChallenge,
  cheerPublicGoal,
} = require('../controllers/socialController');
const { protect } = require('../middleware/auth');

router.post('/groups', protect, createFriendGroup);
router.get('/groups', protect, getFriendGroups);
router.post('/groups/join', protect, joinFriendGroup);
router.get('/groups/:id/leaderboard', protect, getLeaderboard);

router.get('/challenges', protect, getChallenges);
router.post('/challenges/join', protect, joinChallenge);
router.post('/challenges/:id/log', protect, logChallengeSavings);
router.delete('/challenges/:id', protect, deleteChallenge);

router.post('/goals/:goalId/cheer', protect, cheerPublicGoal);

module.exports = router;
