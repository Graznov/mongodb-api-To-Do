const express = require('express');
const cors = require('cors')
const { connectToDb, getDb } = require('./db');
const {ObjectId} = require("mongodb");
const {query, json, response} = require("express");
const {generateToken, changeAccessToken, changeRefreshToken, generateAccessToken, generateRefreshToken, verifyJWT} = require("./generToken");
const cookieParser = require('cookie-parser');
const { MongoClient } = require("mongodb");
const {set} = require("express/lib/application");
const domain = require("node:domain");
const {verify} = require("jsonwebtoken");
require('dotenv').config()
const jwt = require('jsonwebtoken');


// const secretKey = process.env.VERY_VERY_SECRET;
// const port = process.env.PORT;
//
// console.log('Секретный ключ:', secretKey);
// console.log('Приложение запущено на порту:', port);

const corsOptions = {
    origin: 'http://localhost:5173',  // Заменить на нужный домен или массив доменов или разрешить все домены '*'
    methods: ['GET', 'POST', 'PATCH', 'DELETE'], // Разрешаем HTTP-методы
    allowedHeaders: ['Content-Type', 'Authorization'],  //Разрешаем заголовки
    credentials: true,              // Разрешить отправку куки и авторизационных данных
};

const PORT = 3000;

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

let db

connectToDb((err)=>{
    if (!err){
        app.listen(PORT, (err) => {
            err ? console.log(err) : console.log(`Listening port ${PORT}`);
        });
        db = getDb()
    } else {
        console.log(`DB connection error: ${err}`);
    }
})

const handleError = (res, error) => {
    res.status(500).json({ error })
}

//Добавление аккаунта и аутентификация:
app.post('/lists/register', (req, res) => {
    db
        .collection('lists')
        .findOne( { email:req.body.email } )
        .then(doc => {
            if(doc){
                console.log(1, `Email ${req.body.email} занято`)
                res
                    .status(409)
                    .json('имя занято')
            } else {
                console.log(2, `Email ${req.body.email} свободно`)
                db
                    .collection('lists')
                    .insertOne(req.body)
                    .then((result)=>{
                        db.collection('lists').updateOne({ _id: result.insertedId }, {
                            $set: {
                                refreshToken: '',
                                accessToken: '',
                                creatDat: new Date(),
                                tasksList:[]} }) //добавление токена и даты создания
                        res
                            .status(201)
                            .json("Created")
                    })
            }
        })
        .catch(()=> handleError(res, 'Something went wrong.'))
})

app.post('/lists/login', async (req, res) => {
    const { email, password } = req.body;

    console.log(`email: ${ email }\npassword: ${ password }`);

    try{
        const user = await db.collection('lists').findOne({ email: email, password: password });
        if(!user) return res.status(400).json({ message: 'Пользователь не найден' })
        console.log(user)

        const accessToken = generateAccessToken(user._id, email);
        const refreshToken = generateRefreshToken(user._id, email);

        await db.collection('lists').updateOne(
            { _id: user._id },
            { $set: { accessToken: accessToken, refreshToken: refreshToken } }
        );

        const responseData = {
            email: user.email,
            accessToken: accessToken,
            id: user._id,
            name: user.name
        };

        res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
            maxAge: 900000, // Время жизни cookie в миллисекундах (15 минут)
            httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
            secure: true, // Cookie будут отправляться только по HTTPS
            sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
        })

        res.status(200).json(responseData);
        console.log(`Данные отправлены:\n${JSON.stringify(responseData)}`);

    } catch (e) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }

});

app.post('/lists/del-cookie', (req, res) => {
    console.log(`Del cookie`)
    res.cookie('refreshToken', '', {
        maxAge: -1, // Время жизни cookie в миллисекундах (15 минут)
        httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
        secure: true, // Cookie будут отправляться только по HTTPS
        sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
    });
    res.send('Cookie has been set!');
}); //удаление Cookie с фронта при выходе из аккаунта

//...добавление и аутентификация



//получение данных акка...

app.get('/lists/:id', async (req, res) => {

    const accessToken = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshToken = cookies.refreshToken

    try{
        const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})
        // console.log(`user:\n${JSON.stringify(user)}`
        if(!user) return res.status(400).json({message: 'Пользователь не найден'})

        if(verifyJWT(accessToken, process.env.VERY_VERY_SECRET_FOR_ACCESS)){
            console.log(`TOKEN GOOD`)
        } else {

            if(verifyJWT(refreshToken, process.env.VERY_VERY_SECRET_FOR_REFRESH)){
                console.log(`refreshToken GOOD`)
                //тут смена токенов!!!

                const accessToken = generateAccessToken(user._id, user.email);
                const refreshToken = generateRefreshToken(user._id, user.email);
                await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
                    { $set: { accessToken: accessToken, refreshToken: refreshToken } }
                )

                const responseUser = {
                    id: user._id,
                    name: user.name,
                    accessToken:accessToken,
                    // email: user.email,
                    // creatDat: user.creatDat,
                    tasks: user.tasksList
                }

                res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                    maxAge: 900000, // Время жизни cookie в миллисекундах (15 минут)
                    httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                    secure: true, // Cookie будут отправляться только по HTTPS
                    sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
                })
                // res.status(200).json(responseUser)
                return res.json(responseUser)
            } else{
                //refreshToken неверен, нужно перелогиниться
                return res.status(400).json({ message:'Токен не совпадает'})
            }
        }

        const responseUser = {
            id: user._id,
            name: user.name,
            // accessToken:user.accessToken,
            // email: user.email,
            // creatDat: user.creatDat,
            tasks: user.tasksList
        }
        res.status(200).json(responseUser)
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
})



// временно:
app.get('/lists/', (req, res) => {

    console.log(`req.header: ${req.headers['authorization']}`);

    let arr = []
    db
        .collection('lists')
        .find()
        .forEach(elem => {
            arr.push(elem)
        })
        .then((doc)=>{
            res
                .status(200)
                .json(arr)
        })
        .catch(()=> handleError(res, 'Something went wrong.'))

})

//Удаление:
app.delete('/lists/:id', (req, res) => {
    if(ObjectId.isValid(req.params.id)){
        db
            .collection('lists')
            .deleteOne({ _id: new ObjectId(req.params.id) })
            .then((result)=>{
                res
                    .status(200)
                    .json(result)
            })
            .catch(()=> handleError(res, 'Something went wrong.'))

    } else {
        handleError(res, 'Del.Wrong id')
    }
})
//...удаление

//Изменение записей...
app.patch('/lists/:id', async (req, res)=>{

    console.log(`PATCH start`)
    console.log(1)
    const accessToken = req.headers['authorization'];
    console.log(2)
    const cookies = Object.assign({}, req.cookies);
    console.log(3)
    const refreshToken = cookies.refreshToken
    //
    // console.log(`accessToken: ${accessToken}\nrefreshToken: ${refreshToken}\nid=${req.params.id}`);

    // console.log(req.body)
    // try{
        //
    console.log(4)
        const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})
    console.log(5)
        if(!user) return res.status(400).json({message: 'Пользователь не найден'})
    console.log(6)
        // if(verifyJWT(accessToken, process.env.VERY_VERY_SECRET_FOR_ACCESS)){
        //     console.log(7)
        //     console.log(`server.js accessToken GOOD`)
        //     console.log(8)
        // } else {
        //     console.log(9)
        //     if(verifyJWT(refreshToken, process.env.VERY_VERY_SECRET_FOR_REFRESH)){
        //         console.log(10)
        //         console.log(`server.js refreshToken GOOD`)
        //         console.log(11)
        //         //тут смена токенов!!!
        //
        //         const accessToken = generateAccessToken(user._id, user.email);
        //         console.log(12)
        //         const refreshToken = generateRefreshToken(user._id, user.email);
        //         console.log(13)
        //         await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
        //             { $set: { accessToken: accessToken, refreshToken: refreshToken } }
        //         )
        //         console.log(14)
        //
        //         const responseUser = {
        //             accessToken:accessToken,
        //         }
        //         console.log(15)
        //
        //         res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
        //             maxAge: 900000, // Время жизни cookie в миллисекундах (15 минут)
        //             httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
        //             secure: true, // Cookie будут отправляться только по HTTPS
        //             sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
        //         })
        //         console.log(16)
        //         // res.status(200).json(responseUser)
        //         console.log(111111111)
        //
        //         await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
        //             { $set: { tasksList: req.body } })
        //         console.log(17)
        //
        //         return res.json(responseUser)
        //     } else{
        //         console.log(18)
        //         //refreshToken неверен, нужно перелогиниться
        //         return res.status(400).json({ message : 'Токен не совпадает'})
        //     }
        //     console.log(19)
        //
        // }
    console.log(20)

        await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
            { $set: { tasksList: req.body } })

    console.log(21)
        console.log(`#############\napp.patch(...\nreq.params.id: ${req.params.id}\nemail: ${user.email}\nreq.headers['authorization']: ${req.headers['authorization']}\n#############`)

    console.log(22)
    // return response

        // const responseUser = {
        //     id: user._id,
        //     name: user.name,
        //     // accessToken:user.accessToken,
        //     // email: user.email,
        //     // creatDat: user.creatDat,
        //     tasks: user.tasksList
        // }
        // res.status(200).json(responseUser)
    // } catch (error) {
    //     console.error('Ошибка при входе:', error);
    //     res.status(500).json({ message: 'Ошибка сервера' });
    // }

})
// ...изменение записей










