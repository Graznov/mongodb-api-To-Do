const { MongoClient } = require("mongodb");


// function generateToken(length) {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let token = '';
//     for (let i = 0; i < length; i++) {
//         const randomIndex = Math.floor(Math.random() * characters.length);
//         token += characters[randomIndex];
//     }
//     return token;
// }
//
// exports.generateToken=generateToken;
//
// // Обновление RefreshToken...
// async function changeRefreshToken(){
//     const url = "mongodb://localhost:27017"; // Укажите URI MongoDB
//     const client = new MongoClient(url);
//     await client.connect()
//     const database = client.db("to_do_list"); // Название базы данных
//     await database
//         .collection('lists')
//         .find()
//         .forEach(elem => {
//
//             database
//                 .collection('lists')
//                 .updateMany({email: elem.email}, {$set:{refreshToken:generateToken(41)}})
//             // console.log(`elem._id: ${elem._id}\nelem.refreshToken: ${elem.refreshToken}`);
//         })
// }
// exports.changeRefreshToken = changeRefreshToken;
// // changeRefreshToken()
// // ...обновление RefreshToken
//
// // Обновление accessToken...
// async function changeAccessToken(){
//     const url = "mongodb://localhost:27017"; // Укажите URI MongoDB
//     const client = new MongoClient(url);
//     await client.connect()
//     const database = client.db("to_do_list"); // Название базы данных
//     await database
//         .collection('lists')
//         .find()
//         .forEach(elem => {
//
//             database
//                 .collection('lists')
//                 .updateMany({email: elem.email}, {$set:{accessToken:generateToken(13)}})
//             // console.log(`elem._id: ${elem._id}\nelem.refreshToken: ${elem.refreshToken}`);
//         })
// }
// // changeAccessToken()
// exports.changeAccessToken= changeAccessToken;
// ...обновление accessToken


/////////////////////////////////////////////////////////////////
/////////// ДАЛЕЕ JWT:

const jwt = require('jsonwebtoken');
require('dotenv').config()


// Секретный ключ — его нужно хранить в переменных окружения!
// const secretKey = 'yourSecretKey';

const secretAccessKey = process.env.VERY_VERY_SECRET_FOR_ACCESS;
const secretRefreshKey = process.env.VERY_VERY_SECRET_FOR_REFRESH;

// Функция для генерации токена
function generateAccessToken(a, b) {
    // Payload — данные, которые ты хочешь сохранить в токене
    const payload = { id: a, email: b };
    console.log(`AT`)
    // Генерация токена
    return jwt.sign(payload, secretAccessKey, { expiresIn: '10m' }); // Токен истекает через 1 час
}

function generateRefreshToken(a, b) {
    // Payload — данные, которые ты хочешь сохранить в токене
    const payload = { id: a, email: b };

    console.log(`RT`)
    // Генерация токена
    return jwt.sign(payload, secretRefreshKey, { expiresIn: '30m' }); // Токен истекает через 1 час
}



// Пример использования
const user = { id: 777, name: 'Kapt. John V.' }; // Примерные данные пользователя
// const accToken = generateAccessToken(user);
// console.log('Generated AccToken:', accToken);

exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
