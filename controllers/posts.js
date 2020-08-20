const fs = require('fs');

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Post = require('../models/post');
const User = require('../models/user');
const getCoordinates = require('../util/location');


const getPostById = async (req, res, next) => {
    const postId = req.params.postId;
    //const post = DUMMY_POSTS.find((post) => post.id === postId);
    let post;
    try {
        post = await Post.findById(postId);
    }
    catch(error) {
        return next(
          new HttpError(
            "Something went wrong with fetching the post, please try again.",
            500
          )
        );
    }

    if(!post) {
         return next(new HttpError("Post cannot be found.", 404));
    }

    res.json({
        post: post.toObject({ getters: true })
    });
}

const getUserPosts = async (req, res, next) => {
    const userId = req.params.userId;
    /*const userPosts = DUMMY_POSTS.filter((post) => {
        return post.userId === userId;
    });*/

    let userPosts;
    try {
        //userPosts = await User.findById(userId).populate('posts');
        userPosts = await Post.find({ userId: userId });
    }
    catch(error) {
        return next(
          new HttpError(
            "Something went wrong with fetching this user's post, please try again.",
            500
          )
        );
    }

    if(!userPosts || userPosts.length === 0) {
        return next(new HttpError("Posts for user cannot be found.", 404));
    }

    res.json({
        userPosts: userPosts.map(post => post.toObject({ getters: true}))
    });
}

const createPost = async (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs passed", 422));
    }

    const { title, description, address } = req.body;

    let coordinates;
    
    if(address && address.length !== 0) {
        try {
            coordinates = await getCoordinates(address);
        }
        catch(error) {
            return next(new HttpError("Creating post failed, please try again"), 500);
        }
    }

    let image = '';
    if(req.file) image = req.file.path;

    const createdPost = new Post({
      title: title,
      description: description,
      address: address,
      location: coordinates,
      image: image,
      userId: req.userData.userId,
    });

    let user;
    try{
        user = await User.findById(req.userData.userId);
    }
    catch(error) {
        return next(new HttpError("Creating post failed, please try again"), 500);
    }

    if(!user) {
        return next(new HttpError("Cannot find user with given user id"), 404);
    }

    //DUMMY_POSTS.push(createdPost);
    try {
        // Rolls back changes if transactions fail
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPost.save({ session: sess });
        user.posts.push(createdPost); // Only pushes the user id to post
        await user.save({ session: sess });
        await sess.commitTransaction();
    }
    catch(error) {
        return next(new HttpError("Creating post failed, please try again"), 500);
    }

    res.status(201).json({
        post: createdPost
    });
};

const updatePost = async (req, res, next) => {
    const { title, description, address } = req.body;
    const postId = req.params.postId;

    let postToUpdate;
    try {
        postToUpdate = await Post.findById(postId);
    }
    catch(error) {
        return next(
          new HttpError(
            "Something went wrong with updating the post, please try again.",
            500
          )
        );
    }

    /*const postToUpdate = {...DUMMY_POSTS.find(p => p.id === postId)};
    const postIndex = {...DUMMY_POSTS.findIndex(p => p.id === postId)};*/
    if(postToUpdate.userId.toString() !== req.userData.userId) {
        return next(new HttpError("You cannot edit this post.", 401));
    }

    let coordinates;
    
    if(address && address.length !== 0) {
        try {
            coordinates = await getCoordinates(address);
        }
        catch(error) {
            //return next(new HttpError("Incorrect address", 422));
            //return next(error);
        }
    }

    postToUpdate.title = title || "";
    postToUpdate.description = description || "";
    postToUpdate.address = address || "";
    postToUpdate.location = coordinates || "";

    //DUMMY_POSTS[postIndex] = postToUpdate;
    try {
        await postToUpdate.save();
    }
    catch(error) {
        return next(new HttpError(
            "Something went wrong with updating the post, please try again.",
            500
          ));
    }

    res.status(200).json({
        post: postToUpdate.toObject({ getters: true })
    });
};

const deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    
    /*if(!DUMMY_POSTS.find(post => post.id === postId)) {
        return next(new HttpError("Can not find post to delete", 404));
    }*/

    let postToDelete;
    try{
        postToDelete = await Post.findById(postId).populate('userId');
    }
    catch(error) {
        return next(new HttpError("Something went wrong with deleting this post, please try again later.", 500));
    }

    if(!postToDelete) {
        return next(new HttpError("Could not find post to delete with given post id.", 404));
    }

    if(postToDelete.userId.id !== req.userData.userId) {
        return next(new HttpError("You cannot delete this post.", 401));
    }
    
    const imageToDeletePath = postToDelete.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await postToDelete.remove({ session: sess });
        postToDelete.userId.posts.pull(postToDelete); // Only pushes the user id to post
        await postToDelete.userId.save({ session: sess });
        await sess.commitTransaction();
    }
    catch(error) {
        return next(new HttpError("Something went wrong with deleting this post, please try again later.", 500));
    }

    //DUMMY_POSTS = DUMMY_POSTS.filter(post => post.id !== postId);

    fs.unlink(imageToDeletePath, err => {});

    res.status(200).json({
        message: "Post deleted."
    });
};


exports.getPostById = getPostById;
exports.getUserPosts = getUserPosts;
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.deletePost = deletePost;