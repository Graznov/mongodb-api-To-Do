const express = require('express');
const cors = require('cors')
const { connectToDb, getDb } = require('./db');
const {ObjectId} = require("mongodb");
const {query} = require("express");
const {generateToken, changeAccessToken, changeRefreshToken} = require("./generToken");
const cookieParser = require('cookie-parser');
const { MongoClient } = require("mongodb");
const {set} = require("express/lib/application");
const domain = require("node:domain");


const corsOptions = {
    origin: 'http://localhost:5173',  // Заменить на нужный домен или массив доменов или разрешить все домены '*'
    methods: ['GET', 'POST', 'PATCH', 'DELETE'], // Разрешаем HTTP-методы
    allowedHeaders: ['Content-Type', 'Authorization'],  //Разрешаем заголовки
    credentials: true,              // Разрешить отправку куки и авторизационных данных
};

const PORT = 3000;

///////////////////


// const app = express();

// Подключаем cookie-parser
// app.use(cookieParser());
///////////////////

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

function decodeVallue(a){

    let form = {
        email:'',
        pass:''
    }
    let spase = false

    a.split('').forEach((el) => {
        if (el === ' ') spase = true;
        if (!spase ) {
            form.email += el
        } else if(spase && el !== ' ') {
            form.pass += el
        }
    })

    // console.log(`email: ${form.email.split('')}\npass: ${form.pass.split('')}`)
    return [form.email, form.pass]

}

// Обновление RefreshToken...
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
// changeRefreshToken()
// ...обновление RefreshToken

// обновление токенов:
const timeAccessTok = 900000 //15min
const timeRefreshTok = 86400000 //24hours
setInterval(()=>{
    console.log('change access token')
    changeAccessToken()
}, timeAccessTok)

setInterval(()=>{
    console.log('change refresh token')
    changeRefreshToken()
}, timeRefreshTok)

// ...обновление токенов


//Добавление аккаунта:
app.post('/lists', (req, res) => {

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
                                $set: { refreshToken: generateToken(41),
                                accessToken: generateToken(13),
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
//...добавление

//Аутитнтефикация...

app.get('/lists/:vallue', (req, res) => {
    // if(ObjectId.isValid(req.params.vallue)){
    console.log(`req.params.vallue: ${req.params.vallue}`);

    if (req.params.vallue.includes(' ')){
        db
            .collection('lists')
            .findOne({ email: decodeVallue(req.params.vallue)[0], password: decodeVallue(req.params.vallue)[1] })
            .then((doc)=>{

                console.log(`doc:${JSON.stringify(doc)}`)
                let docRedact = {
                    name:doc.name,
                    email:doc.email,
                    refreshToken:doc.refreshToken,
                    accessToken:doc.accessToken,
                    tasksList:doc.tasksList,
                    creatDat:doc.creatDat,
                    id:doc._id
                }


                if(doc){
                    res
                        .status(200)
                        .json(docRedact)
                } else {
                    console.log('No Document Found')
                }

            })
            .catch(()=> handleError(res, 'Something went wrong.'))
    } else {

        console.log(`accessToken: ${req.params.vallue}`)
            db
                .collection('lists')
                .findOne({ accessToken: req.params.vallue})
                .then((doc)=>{

                    console.log(`doc:${JSON.stringify(doc)}`)
                    let docRedact = {
                        name:doc.name,
                        email:doc.email,
                        refreshToken:doc.refreshToken,
                        accessToken:doc.accessToken,
                        tasksList:doc.tasksList,
                        creatDat:doc.creatDat,
                        id:doc._id
                    }


                    if(doc){
                        res
                            .status(200)
                            .json(docRedact)
                    } else {
                        console.log('No Document Found')
                    }

                })
                .catch(()=> handleError(res, 'Something went wrong.'))
    }



    // } else {

    // handleError(res, 'Wrong id')

    //     db
    //         .collection('lists')
    //         .findOne({email:req.params.vallue})
    //         .then(doc => {
    //             if(doc){
    //                 res.json({message: `Email ${req.params.vallue} занято`,
    //                 data:doc})
    //             } else {
    //                 res.status(404).json({ message: `Список с email ${req.params.vallue} не найден.` })
    //             }
    //         })
    //         .catch(()=> handleError(res, 'Something went wrong.'))
    //
    // }
})
//...аутитнтефикация


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
app.patch('/lists/:id', (req, res)=>{

    console.log(`***************************\nreq:`)
    // app.use(cookieParser());
    console.log(req.params)
    console.log(`***************************\ncookies:`)
    const cookies = Object.assign({}, req.cookies);
    console.log(cookies); // Обычный объект
    console.log(req.cookies['refreshToken'])

    if(ObjectId.isValid(req.params.id)){
        db
            .collection('lists')
            .updateOne({ _id: new ObjectId(req.params.id) }, {  $set: { tasksList: req.body } } )
            // .updateMany({ email: req.params.id }, {  $set: { tasksList: req.body } } )
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
// ...изменение записей

// console.log(generateToken(41))
// const timer = setInterval(()=>{
//     console.log(13)
// },1000)

// app.get('/lists/:email', async (req, res) => {
    // try {
    //     const listName = req.params.name; // Получаем значение параметра "name" из URL
    //     const foundList = await db.collection('lists').findOne({ name: listName });
    //
    //     if (!foundList) {
    //         return res.status(404).json({ message: `Список с именем ${listName} не найден.` });
    //     }
    //
    //     // return res.json(foundList); // Возвращаем найденный список
    //     return res.json({message: `Имя ${listName} занято`})
    // } catch (error) {
    //     handleError(res, 'Something went wrong.');
    // }


//     db
//         .collection('lists')
//         .findOne({email:req.params.email})
//         .then(doc => {
//             if(doc){
//                 res.json({message: `Аккаунт ${req.params.email} найден`})
//             } else {
//                 res.status(404).json({ message: `Аккаунт ${req.params.email} не найден.` })
//             }
//         })
//         .catch(()=> handleError(res, 'Something went wrong.'))
//
// });



// app.get('/lists', (req, res) => {
//     const lists = []
//
//     // console.log(req.params)
//     // if(!req.params.vallue){
//     //     console.log(req.params.vallue)
//     //     return
//     // }
//     db
//         .collection('lists')
//         .find()
//         .sort({ number: 1 })
//         .forEach((list)=>{
//             lists.push(list)
//         })
//         .then(()=>{
//             res
//                 .status(200)
//                 .json(lists)
//         })
//         .catch(()=> handleError(res, 'Something went wrong.'))
//
// })

// app.get('/lists/:id/Array', (req, res) => {
//     // const lists = []
//     db
//         .collection('lists')
//         .findOne({ _id: new ObjectId(req.params.id) })
//         .then((doc)=>{
//             res
//                 .status(200)
//                 .json(doc.Array)
//         })
//         .catch(()=> handleError(res, 'Something went wrong.'))
//
// })














// Изменение:
// app.patch('/lists/:id', (req, res)=>{
//
//     if(ObjectId.isValid(req.params.id)){
//         db
//             .collection('lists')
//             .updateOne({ _id: new ObjectId(req.params.id) }, {  $set : req.body } )
//             .then((result)=>{
//                 res
//                     .status(200)
//                     .json(result)
//             })
//             .catch(()=> handleError(res, 'Something went wrong.'))
//
//     } else {
//         handleError(res, 'Del.Wrong id')
//     }
// })



// app.post('/lists/', (req, res)=>{

    // const lists = []
    // db
    //     .collection('lists')
    //     .find()
    //     .sort({ number: 1 })
    //     .forEach((list)=>{lists.push(list.name)})
    //
    // console.log(lists)

    // if(ObjectId.isValid(req.params.id)){
    //     db
    //         .collection('lists')
    //         .updateOne({ _id: new ObjectId(req.params.id) }, {  $set : req.body } )
    //         .then((result)=>{
    //             res
    //                 .status(200)
    //                 .json(result)
    //         })
    //         .catch(()=> handleError(res, 'Something went wrong.'))
    //
    // } else {
    //     handleError(res, 'Del.Wrong id')
    // }
// })


// 111111111111111111