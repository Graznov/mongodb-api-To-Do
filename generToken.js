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


