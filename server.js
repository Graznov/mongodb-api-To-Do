const express = require('express');
const cors = require('cors')
const { connectToDb, getDb } = require('./db');
const {ObjectId} = require("mongodb");
const {query, json, response} = require("express");
const {generateToken, changeAccessToken, changeRefreshToken, generateAccessToken, generateRefreshToken} = require("./generToken");
const cookieParser = require('cookie-parser');
const { MongoClient } = require("mongodb");
const {set} = require("express/lib/application");
const domain = require("node:domain");
require('dotenv').config()

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



//Аутитнтефикация...



// app.get('/lists/:vallue', (req, res) => {
//     // if(ObjectId.isValid(req.params.vallue)){
//     console.log(`req.params.vallue: ${req.params.vallue}`);
//     let refTok = '___'
//     // console.log(`req.params.vallue: ${req.header()}`);
//     // document.cookie="EXPERIMENT=ExperVall"
//
//     if (req.params.vallue.includes(' ')){
//
//         let name = ''
//         let id = ''
//
//         db
//             .collection('lists')
//             .findOne({ email: decodeVallue(req.params.vallue)[0], password: decodeVallue(req.params.vallue)[1] })
//             .then(doc=>{
//                 name=doc.name
//                 id=doc._id
//             })
//
//         db
//             .collection('lists')
//             .updateMany({ email: decodeVallue(req.params.vallue)[0], password: decodeVallue(req.params.vallue)[1] },
//                         {$set:{accessToken:generateAccessToken(id, name),
//                             refreshToken:generateRefreshToken(id, name)}})
//
//
//         db
//             .collection('lists')
//             .findOne({ email: decodeVallue(req.params.vallue)[0], password: decodeVallue(req.params.vallue)[1] })
//             .then((doc)=>{
//
//
//                 // console.log(`doc:${JSON.stringify(doc)}`)
//                 let docRedact = {
//                     // name:doc.name,
//                     // email:doc.email,
//                     refreshToken:doc.refreshToken,
//                     accessToken:doc.accessToken,
//                     // tasksList:doc.tasksList,
//                     // creatDat:doc.creatDat,
//                     // id:doc._id
//                 }
//                 // refTok = generateRefreshToken(doc._id, doc.name)
//                 refTok = docRedact.refreshToken
//                 console.log(`docRedact: `, docRedact)
//
//
//                 if(doc){
//                     res
//                         .status(200)
//                         .json(docRedact)
//
//                 } else {
//                     console.log('No Document Found')
//                 }
//
//             })
//
//
//
//     }  else if(req.params.vallue.includes('set-cookie')){
//
//         console.log('set-cookie')
//         res.cookie('refreshToken', refTok, {
//             maxAge: 900000, // Время жизни cookie в миллисекундах (15 минут)
//             httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
//             secure: true, // Cookie будут отправляться только по HTTPS
//             sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
//         });
//             res.send('Cookie has been set!');
//
//             // refTok='___'
//
//     } else if(req.params.vallue.includes('del-cookie')){
//         console.log('del-cookie')
//         res.cookie('refreshToken', '', {
//             maxAge: -1, // Время жизни cookie в миллисекундах (15 минут)
//             httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
//             secure: true, // Cookie будут отправляться только по HTTPS
//             sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
//         });
//
//         res.send('Cookie has been set!');
//
//     } else {
//
//         console.log(`accessToken: ${req.params.vallue}`)
//             db
//                 .collection('lists')
//                 .findOne({ accessToken: req.params.vallue})
//                 .then((doc)=>{
//
//                     console.log(`doc:${JSON.stringify(doc)}`)
//                     let docRedact = {
//                         name:doc.name,
//                         email:doc.email,
//                         refreshToken:doc.refreshToken,
//                         accessToken:doc.accessToken,
//                         tasksList:doc.tasksList,
//                         creatDat:doc.creatDat,
//                         id:doc._id
//                     }
//
//
//                     if(doc){
//                         res
//                             .status(200)
//                             .json(docRedact)
//                     } else {
//                         console.log('No Document Found')
//                     }
//
//                 })
//                 .catch(()=> handleError(res, 'Something went wrong.'))
//     }
//
//
// })
//...аутитнтефикация

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
app.patch('/lists/:email', (req, res)=>{

    // console.log(`############################\nreq:`)
    // // app.use(cookieParser());
    // console.log(req.params)
    // console.log(`***************************\ncookies:`)
    // const cookies = Object.assign({}, req.cookies);
    // console.log(cookies); // Обычный объект
    // console.log(req.cookies['refreshToken', 'username'])

    const authHeader = req.headers['authorization'];
    console.log(authHeader)

    db
        .collection('lists')
        .findOne({ email: req.params.email})
        .then((doc)=>{

            if(doc){
                if(doc.accessToken===authHeader){
                    console.log('TOKEN OK')
                    db
                        .collection('lists')
                        // .updateOne({ accessToken: req.params.at}, {  $set: { tasksList: req.body } } )
                        .updateMany({ email: req.params.email }, {  $set: { tasksList: req.body } } )

                        .then((result)=>{
                            console.log(result)
                            res
                                .status(200)
                                .json(result)
                        })
                } else {
                    console.log('TOKEN ERROR!!!')
                }
            }

        })

        // if(ObjectId.isValid(req.params.id)){

        // .then(response=>{
        //     if(response){
        //         console.log('responseOK:',response)
        //     } else {
        //         console.log('responseBAD')
        //     }
        // })
        .catch(()=> handleError(res, 'Something went wrong.'))

    // } else {
    //     handleError(res, 'Del.Wrong id')
    //
    // }

})
// ...изменение записей










