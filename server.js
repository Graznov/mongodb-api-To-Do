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
const {recCloud} = require("./recCloud");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const upload = multer({ dest: 'uploads/' })

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
                                pathImg: '',
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

    try{
        const user = await db.collection('lists').findOne({ email: email, password: password });
        if(!user) return res.status(400).json({ message: 'Пользователь не найден' })

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
            name: user.name,
            pathImg: user.pathImg,
        };

        res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
            maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
            httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
            secure: true, // Cookie будут отправляться только по HTTPS
            sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
        })

        res.status(200).json(responseData);

    } catch (e) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }

});

app.post('/lists/del-cookie', (req, res) => {
    res.cookie('refreshToken', '', {
        maxAge: -1, // Время жизни cookie в миллисекундах (15 минут)
        httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
        secure: true, // Cookie будут отправляться только по HTTPS
        sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
    });
    res.send('Cookie has been set!');
}); //удаление Cookie с фронта при выходе из аккаунта

//...добавление и аутентификация


// установка аватарки...
let filaName = '' //для удаления файла
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // cb(null, Date.now() + '-' + file.originalname); // Уникальное имя файла
        let tchk = false
        let endName = file.originalname.split('').reduce((result, name) => {
            if(name==='.' && !tchk){
                result.push(name)
                tchk=true
            } else if(tchk) {
                result.push(name)
            }
            return result;
        },[]).join('');

        filaName = `111${endName}`;
        cb(null, filaName)
    },
});


function deleteImg(){
    fs.unlink(`uploads/${filaName}`, (err) => {
        if (err) {
            console.error('Ошибка при удалении файла:', err);
        } else {
            console.log('Файл успешно удален.');
        }
    });
}

const upload = multer({ storage });

app.post('/lists/avatar/:id', upload.single('file'), async (req, res) => {

    const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})
    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    if (!req.file) {
        return res.status(400).json({ message: 'Файл не был загружен' });
    }

    const pathToAvatar = await recCloud(`uploads/${filaName}`)

    res.status(200).json({
        message: 'Файл успешно загружен',
        file: req.file,
        pathToAvatar:pathToAvatar
    });

    await db
        .collection('lists')
        .updateOne({_id: new ObjectId (req.params.id)},
            {$set:
                    {pathImg: pathToAvatar}
            })
        deleteImg()

});


// ...установка аватарки



//получение данных акка...

app.get('/lists/:id', async (req, res) => {

    const accessToken = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshToken = cookies.refreshToken

    try{
        const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})
        if(!user) return res.status(400).json({message: 'Пользователь не найден'})



        if(verifyJWT(accessToken, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessToken')){

        } else {
            if(verifyJWT(refreshToken, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){
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
                    email: user.email,
                    creatDat: user.creatDat,
                    tasks: user.tasksList,
                    pathImg: user.pathImg
                }

                res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                    maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
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
            email: user.email,
            creatDat: user.creatDat,
            tasks: user.tasksList,
            pathImg: user.pathImg
        }
        res.status(200).json(responseUser)
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
})



// временно:
app.get('/lists/', (req, res) => {

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
app.delete('/lists/delete/:id', (req, res) => {

    const accessTokenFont = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshTokenFront = cookies.refreshToken

    const user = db.collection('lists').findOne({_id: new ObjectId (req.params.id)})
    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    if(verifyJWT(accessTokenFont, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessT')
        && verifyJWT(refreshTokenFront, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){

        res.cookie('refreshToken', '', { //ставим на фронт refreshToken
            maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
            httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
            secure: true, // Cookie будут отправляться только по HTTPS
            sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
        })
            db
                .collection('lists')
                .deleteOne({ _id: new ObjectId(req.params.id) })
                .then((result)=>{
                    res
                        .status(200)
                        .json(result)
                })
    } else {
        res.cookie('refreshToken', '', { //ставим на фронт refreshToken
            maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
            httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
            secure: true, // Cookie будут отправляться только по HTTPS
            sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
        })
        res.status(888).json(`result`)
    }
})
//...удаление

//Добавление новой записи...
app.patch('/lists/pushtask/:id', async (req, res)=>{

    const accessTokenFont = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshTokenFront = cookies.refreshToken

    const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})

    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    async function updateBD(){
        await db
            .collection('lists')
            .updateOne({_id: new ObjectId (req.params.id)}, {$push: {tasksList: req.body}} )
    }

        if(verifyJWT(accessTokenFont, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessT')){
            updateBD()
        } else {

            if(verifyJWT(refreshTokenFront, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){

                updateBD()

                const accessToken = generateAccessToken(user._id, user.email);
                const refreshToken = generateRefreshToken(user._id, user.email);

                await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
                    { $set: { accessToken: accessToken, refreshToken: refreshToken } }
                )

                res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                    maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
                    httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                    secure: true, // Cookie будут отправляться только по HTTPS
                    sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
                })

                return res.json({accessToken:accessToken})
            } else {

                res.cookie('refreshToken', '', { //ставим на фронт refreshToken
                    maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
                    httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                    secure: true, // Cookie будут отправляться только по HTTPS
                    sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
                })
                return res.status(400).json({ message : 'Токен не совпадает'})
            }
        }
})
// ...

//Удаление записи task...
app.patch('/lists/deletetask/:id', async (req, res)=>{

    const idDelTask = req.body.id
    const accessTokenFont = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshTokenFront = cookies.refreshToken

    const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})

    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    async function updateBD(){
        await db
            .collection('lists')
            .updateOne({_id: new ObjectId (req.params.id)},
                {$set:
                        {tasksList: user.tasksList.filter(element => element.id !== idDelTask)}
                })
    }
    if(verifyJWT(accessTokenFont, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessT')){
        updateBD()
    } else {

        if(verifyJWT(refreshTokenFront, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){

            updateBD()

            const accessToken = generateAccessToken(user._id, user.email);
            const refreshToken = generateRefreshToken(user._id, user.email);

            await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
                { $set: { accessToken: accessToken, refreshToken: refreshToken } }
            )

            res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })

            return res.json({accessToken:accessToken})
        } else {

            res.cookie('refreshToken', '', { //ставим на фронт refreshToken
                maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })
            return res.status(400).json({ message : 'Токен не совпадает'})
        }
    }

})
// ...удаление записи task

// изменение записи task...

app.patch('/lists/changetask/:id', async (req, res)=>{

    const accessTokenFont = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshTokenFront = cookies.refreshToken

    const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})

    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    async function updateBD(){
        const arr = user.tasksList.reduce((a,b,c)=>{
            (b.id!==req.body.id) ? a.push(b) : a.push(req.body)
            return a
        },[])
        await db
            .collection('lists')
            .updateOne({_id: new ObjectId (req.params.id)}, {$set:{tasksList: arr}})}

    updateBD()

    if(verifyJWT(accessTokenFont, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessT')){
        updateBD()
    } else {

        if(verifyJWT(refreshTokenFront, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){

            updateBD()

            const accessToken = generateAccessToken(user._id, user.email);
            const refreshToken = generateRefreshToken(user._id, user.email);

            await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
                { $set: { accessToken: accessToken, refreshToken: refreshToken } }
            )

            res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })

            return res.json({accessToken:accessToken})
        } else {

            res.cookie('refreshToken', '', { //ставим на фронт refreshToken
                maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })
            return res.status(400).json({ message : 'Токен не совпадает'})
        }
    }

})
// ...изменение записи task



app.patch('/lists/chacked/:id', async (req, res)=>{

    const accessTokenFont = req.headers['authorization'];
    const cookies = Object.assign({}, req.cookies);
    const refreshTokenFront = cookies.refreshToken

    const user = await db.collection('lists').findOne({_id: new ObjectId (req.params.id)})

    if(!user) return res.status(400).json({message: 'Пользователь не найден'})

    async function updateBD(){
        const arr = user.tasksList.reduce((a,b,c)=>{
            if(b.id!==req.body.id) {
                a.push(b)
            } else {
                (b.isCompleted) ? b.isCompleted=false : b.isCompleted=true
                a.push(b)
            }
            return a
        },[])
        await db
            .collection('lists')
            .updateOne({_id: new ObjectId (req.params.id)}, {$set:{tasksList: arr}})
    }

    if(verifyJWT(accessTokenFont, process.env.VERY_VERY_SECRET_FOR_ACCESS, 'AccessT')){
        updateBD()
    } else {

        if(verifyJWT(refreshTokenFront, process.env.VERY_VERY_SECRET_FOR_REFRESH, 'RefreshToken')){

            updateBD()

            const accessToken = generateAccessToken(user._id, user.email);
            const refreshToken = generateRefreshToken(user._id, user.email);

            await db.collection('lists').updateOne({_id: new ObjectId (req.params.id)},
                { $set: { accessToken: accessToken, refreshToken: refreshToken } }
            )

            res.cookie('refreshToken', refreshToken, { //ставим на фронт refreshToken
                maxAge: 86400000, // Время жизни cookie в миллисекундах (24 часа)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })

            return res.json({accessToken:accessToken})
        } else {

            res.cookie('refreshToken', '', { //ставим на фронт refreshToken
                maxAge: -1, // Время жизни cookie в миллисекундах (60 минут)
                httpOnly: true, // Cookie доступны только на сервере (не через JavaScript на фронтенде)
                secure: true, // Cookie будут отправляться только по HTTPS
                sameSite: 'strict' // Ограничивает отправку cookie только для запросов с того же сайта
            })
            return res.status(400).json({ message : 'Токен не совпадает'})
        }
    }
})
// ...изменение записи task











