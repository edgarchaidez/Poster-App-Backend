const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
    if(req.method === 'OPTIONS') {
        return next();
    }

    try {
        const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer token', so split on space 

        if(!token) {
            return next(new HttpError('User authorization failed.', 403));
        }

        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = { userId: decodedToken.userId }; // Every request can now extract userId
        next();
    }
    catch(error) {
        return next(new HttpError('No authorization provided in request header.'), 403);
    }
};
