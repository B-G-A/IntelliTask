const express = require('express');
const router  = express.Router();
const multer  = require('multer');

const { getNotes, createNote, updateNote, deleteNote, summarizeNote, uploadPdf } = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

// Multer config — store PDF in memory buffer (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.use(protect); // All note routes require auth

router.route('/')
  .get(getNotes)
  .post(createNote);

router.post('/upload-pdf', upload.single('pdf'), uploadPdf);

router.route('/:id')
  .put(updateNote)
  .delete(deleteNote);

router.post('/:id/summarize', summarizeNote);

module.exports = router;
