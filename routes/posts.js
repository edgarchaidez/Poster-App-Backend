const express = require('express');

const checkToken = require('../middleware/check-token');
const postsControllers = require('../controllers/posts');

const fileUpload = require('../middleware/file-upload');

const router = express.Router();

router.get("/:postId", postsControllers.getPostById);

router.get("/user/:userId", postsControllers.getUserPosts);

// Every following route can now only be reached if they have a valid token
router.use(checkToken);

//router.post("/", postsControllers.createPost);
router.post("/", fileUpload.single("image"), postsControllers.createPost);

router.patch('/:postId', postsControllers.updatePost);

router.delete('/:postId', postsControllers.deletePost);

module.exports = router;