const express = require('express');
const {
  addRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require('../controllers/recordController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.post('/', addRecord);
router.get('/', getRecords);
router.get('/:id', getRecord);
router.put('/:id', updateRecord);
router.patch('/:id', updateRecord);
router.delete('/:id', deleteRecord);

module.exports = router;
