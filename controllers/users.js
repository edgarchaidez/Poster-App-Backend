const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUserList = async (req, res, next) => {
  let users;

  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(
      new HttpError(
        "Cannot retrieve users at this time, please try again later.",
        500
      )
    );
  }

  res.status(200).json({
    message: "Returned list of users",
    users: users.map((user) => user.toObject({ getters: true })),
  });
};

const signUpUser = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Make sure to provide a name and a valid email and password",
        422
      )
    );
  }

  const { name, email, password } = req.body;

  //const userExists = DUMMY_USERS.find(u => u.email === email);
  //if(userExists) return next(new HttpError("Cannot sign up, email already exists", 422));

  let userExists;
  try {
    userExists = await User.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong with sign up, please try again later.",
        500
      )
    );
  }

  if (userExists) {
    return next(new HttpError("User with this email already exists.", 422));
  }

  let encryptedPassword;
  try {
    encryptedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(
      new HttpError("Could not create new user, please try again later.")
    );
  }

  let image = "";
  if (req.file) image = req.file.path;

  const newUser = new User({
    name: name,
    email: email,
    password: encryptedPassword,
    image: image,
    posts: [],
    userId: uuidv4(),
  });

  //DUMMY_USERS.push(newUser);
  try {
    await newUser.save();
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong with sign up, please try again later.",
        500
      )
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1hr" }
    );
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong with sign up, please try again later.",
        500
      )
    );
  }

  res.status(201).json({
    message: "User signed up.",
    userId: newUser.id,
    token: token,
    email: newUser.email,
    name: newUser.name,
    image: newUser.image,
  });
};

const loginUser = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid email and/or password", 422));
  }

  const { email, password } = req.body;

  //const user = DUMMY_USERS.find(u => u.email === email);
  let userExists;
  try {
    userExists = await User.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong with log in, please try again later.",
        500
      )
    );
  }

  /*if(!user || user.password !== password) {
        return next(new HttpError("User cannot be found", 404));
    }*/
  if (!userExists) {
    return next(new HttpError("Invalid email. Please sign-up or enter a valid email without periods.", 403));
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, userExists.password);
  } catch (error) {
    return next(
      new HttpError(
        "Cannot log user in at this time, please try again later.",
        500
      )
    );
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid password.", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: userExists.id, email: userExists.email },
        process.env.JWT_KEY,
      { expiresIn: "1hr" }
    );
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong with logging in, please try again later.",
        500
      )
    );
  }

  res.status(201).json({
    message: "User logged in.",
    userId: userExists.id,
    token: token,
    email: userExists.email,
    name: userExists.name,
    image: userExists.image,
  });
};

const updateUserInfo = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new HttpError("Invalid email and/or empty name.", 422));
    }
  
    const { name, email } = req.body;
  
    //const user = DUMMY_USERS.find(u => u.email === email);
    let userExists;
    try {
      userExists = await User.findById(req.userData.userId);
    } catch (error) {
      return next(
        new HttpError(
          "Something went wrong with updating your info, please try again later.",
          500
        )
      );
    }
  
    if (!userExists) {
      return next(
        new HttpError(
          "Something went wrong with updating your info, please try again later.",
          500
        )
      );
    }
    
    if(userExists.id !== req.userData.userId) {
        return next(new HttpError("You cannot edit this information.", 401));
    }

    userExists.name = name;
    userExists.email = email;

    try {
        await userExists.save();
    }
    catch(error) {
        return next(new HttpError(
            "Something went wrong with updating your information, please try again.",
            500
          ));
    }
  
    res.status(200).json({
      message: "Information updated successfully.",
      user: userExists.toObject({ getters: true })
    });
};

exports.getUserList = getUserList;
exports.signUpUser = signUpUser;
exports.loginUser = loginUser;
exports.updateUserInfo = updateUserInfo;
