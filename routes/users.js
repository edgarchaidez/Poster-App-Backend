const express = require("express");
const { check } = require("express-validator");

const checkToken = require("../middleware/check-token");

const fileUpload = require("../middleware/file-upload");

const usersControllers = require("../controllers/users");

const router = express.Router();

router.get("/", usersControllers.getUserList);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersControllers.signUpUser
);

router.post(
  "/login",
  [check("email").isEmail(), check("password").isLength({ min: 6 })],
  usersControllers.loginUser
);

router.use(checkToken);

router.patch(
  "/",
  [check("name").not().isEmpty(), check("email").normalizeEmail().isEmail()],
  usersControllers.updateUserInfo
);

module.exports = router;
