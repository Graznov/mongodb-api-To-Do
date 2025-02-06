const { MongoClient } = require("mongodb");


function generateToken(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        token += characters[randomIndex];
    }
    return token;
}

exports.generateToken=generateToken;

// Обновление RefreshToken...
async function changeRefreshToken(){
    const url = "mongodb://localhost:27017"; // Укажите URI MongoDB
    const client = new MongoClient(url);
    await client.connect()
    const database = client.db("to_do_list"); // Название базы данных
    await database
        .collection('lists')
        .find()
        .forEach(elem => {

            database
                .collection('lists')
                .updateMany({email: elem.email}, {$set:{refreshToken:generateToken(41)}})
            // console.log(`elem._id: ${elem._id}\nelem.refreshToken: ${elem.refreshToken}`);
        })
}
exports.changeRefreshToken = changeRefreshToken;
// changeRefreshToken()
// ...обновление RefreshToken

// Обновление accessToken...
async function changeAccessToken(){
    const url = "mongodb://localhost:27017"; // Укажите URI MongoDB
    const client = new MongoClient(url);
    await client.connect()
    const database = client.db("to_do_list"); // Название базы данных
    await database
        .collection('lists')
        .find()
        .forEach(elem => {

            database
                .collection('lists')
                .updateMany({email: elem.email}, {$set:{accessToken:generateToken(13)}})
            // console.log(`elem._id: ${elem._id}\nelem.refreshToken: ${elem.refreshToken}`);
        })
}
// changeAccessToken()
exports.changeAccessToken= changeAccessToken;
// ...обновление accessToken


/////////////////////////////////////////////////////////////////
/////////// ДАЛЕЕ JWT:

const jwt = require('jsonwebtoken');
require('dotenv').config()


// Секретный ключ — его нужно хранить в переменных окружения!
// const secretKey = 'yourSecretKey';
const secretKey = process.env.VERY_VERY_SECRET;

// Функция для генерации токена
function generateJWToken(user) {
    // Payload — данные, которые ты хочешь сохранить в токене
    const payload = { Number: user.id, String: user.username };

    // Генерация токена
    return jwt.sign(payload, secretKey, { expiresIn: '1h' }); // Токен истекает через 1 час
}

// Пример использования
const user = { id: 777, username: 'Kapt. John V.' }; // Примерные данные пользователя
const token = generateJWToken(user);
console.log('Generated JWToken:', token);
