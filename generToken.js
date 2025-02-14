// const { MongoClient } = require("mongodb");
const jwt = require('jsonwebtoken');
require('dotenv').config()


const secretAccessKey = process.env.VERY_VERY_SECRET_FOR_ACCESS;
const secretRefreshKey = process.env.VERY_VERY_SECRET_FOR_REFRESH;

function generateAccessToken(a, b) {
    const payload = { id: a, email: b };
    console.log(`Run generateAccessToken(a, b)`)
    return jwt.sign(payload, secretAccessKey, { expiresIn: '1m' }); // Токен истекает через 1 час
}

function generateRefreshToken(a, b) {
    const payload = { id: a, email: b };
    console.log(`Run generateRefreshToken(a, b)`)
    return jwt.sign(payload, secretRefreshKey, { expiresIn: '2m' }); // Токен истекает через 1 час
}

function verifyJWT(token, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        console.log(`TOKEN GOOD`)
        return true;
    } catch (error) {
        console.log(`TOKEN BAD`)
        return false;
    }
}

exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyJWT = verifyJWT;
