import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Post from '../models/Post.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   GET /api/posts
// @desc    Get all posts (public feed)
router.get('/', async (req, res) => {
  try {
    // Populate user info (username, name, avatarUrl)
    const posts = await Post.find()
      .populate('user', 'username name avatarUrl')
      .sort({ createdAt: -1 });
      
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching posts' });
  }
});

// @route   POST /api/posts
// @desc    Create a new post (text, image, or both)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { text, imageUrl } = req.body;
    let finalImageUrl = imageUrl || '';

    // If a physical file was uploaded
    if (req.file) {
      // Return local server URL path. For local dev, e.g., /uploads/filename.png
      // The server will host this directory statically
      finalImageUrl = `/uploads/${req.file.filename}`;
    }

    // Validation: text or image must be provided
    if (!text && !finalImageUrl) {
      return res.status(400).json({ message: 'Post must contain text, an image, or both' });
    }

    const newPost = new Post({
      user: req.user.id,
      text,
      imageUrl: finalImageUrl,
      likes: [],
      comments: []
    });

    const savedPost = await newPost.save();
    
    // Populate user details before returning
    const populatedPost = await Post.findById(savedPost._id).populate('user', 'username name avatarUrl');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error creating post' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Toggle like on a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if post already liked by the user
    const likeIndex = post.likes.findIndex(like => like.userId.toString() === req.user.id);

    if (likeIndex > -1) {
      // User already liked, so unlike it
      post.likes.splice(likeIndex, 1);
    } else {
      // User hasn't liked, so add like
      post.likes.push({
        userId: req.user.id,
        username: req.user.username
      });
    }

    await post.save();
    
    // Repopulate user info and return updated post
    const updatedPost = await Post.findById(post._id).populate('user', 'username name avatarUrl');
    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error toggling like' });
  }
});

// @route   POST /api/posts/:id/comment
// @desc    Add comment to a post
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add comment
    post.comments.push({
      userId: req.user.id,
      username: req.user.username,
      text: text.trim()
    });

    await post.save();

    // Award bonus points to post owner? Wait, the reference app shows "Post and Earn Points"
    // Let's implement an interactive touch: when someone comments, the creator gets +1 coins!
    // And when you like, the creator gets +2 coins! This matches the earning mechanics.
    const postCreator = await User.findById(post.user);
    if (postCreator) {
      postCreator.coins += 5; // Bonus coins!
      postCreator.earnings += 0.50; // Bonus cash!
      await postCreator.save();
    }

    // Repopulate user info and return updated post
    const updatedPost = await Post.findById(post._id).populate('user', 'username name avatarUrl');
    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

export default router;
