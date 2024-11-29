const express = require('express');
const cors = require('cors')
const { connectToDb, getDb } = require('./db');
const {ObjectId} = require("mongodb");
const {query} = require("express");
const {generateToken} = require("./generToken");

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

// async function getArrayFromDB() {
//     const client = new MongoClient(url);
//     try {
//         // Подключение к серверу
//         await client.connect();
//         console.log('Подключение успешно!');
//
//         const db = client.db(dbName);
//         const collection = db.collection('YourCollection');
//
//         // Получение данных
//         const data = await collection.find({}, { projection: { name: 1, value: 1, _id: 0 } }).toArray();
//         console.log('Массив из базы данных:', data);
//         return data;
//     } catch (err) {
//         console.error('Ошибка:', err);
//     } finally {
//         await client.close();
//     }
// }




//Добавление:
app.post('/lists', (req, res) => {

    // let bool = false
    // db
    //     .collection('lists')
    //     .find()
    //     .forEach(e=> {
    //         if(e.email===req.body.email) bool=true
    //         console.log(bool)
    //     })
    //     .then(()=>{
    //         if(bool){
    //             res
    //                 .status(404)
    //                 .json( "ERROR EMAIL" )
    //         }
    //     })



    // if(bool===true){
    //     console.log(`bool: ${bool}`)
    // } else if(bool===false) {

        db
            .collection('lists')
            .insertOne(req.body)
            .then((result)=>{
                db.collection('lists').updateOne({ _id: result.insertedId }, { $set: { token: generateToken(41) } }) //добавление токена
                res
                    .status(200)
                    // .json(result)
                    .json("Добавлено")
            })
            .catch(()=> handleError(res, 'Something went wrong.'))

    // }


})

// console.log(generateToken(41))
// const timer = setInterval(()=>{
//     console.log(13)
// },1000)

// app.get('/lists/:name', async (req, res) => {
//     // try {
//     //     const listName = req.params.name; // Получаем значение параметра "name" из URL
//     //     const foundList = await db.collection('lists').findOne({ name: listName });
//     //
//     //     if (!foundList) {
//     //         return res.status(404).json({ message: `Список с именем ${listName} не найден.` });
//     //     }
//     //
//     //     // return res.json(foundList); // Возвращаем найденный список
//     //     return res.json({message: `Имя ${listName} занято`})
//     // } catch (error) {
//     //     handleError(res, 'Something went wrong.');
//     // }
//
//     db
//         .collection('lists')
//         .findOne({name:req.params.name})
//         .then(doc => {
//             if(doc){
//                 res.json({message: `Имя ${req.params.name} занято`})
//             } else {
//                 res.status(404).json({ message: `Список с именем ${req.params.name} не найден.` })
//             }
//         })
//         .catch(()=> handleError(res, 'Something went wrong.'))
//
// });



app.get('/lists', (req, res) => {
    const lists = []
    db
        .collection('lists')
        .find()
        .sort({ number: 1 })
        .forEach((list)=>{
            lists.push(list)
        })
        .then(()=>{
            res
                .status(200)
                .json(lists)
        })
        .catch(()=> handleError(res, 'Something went wrong.'))

})

app.get('/lists/:id/Array', (req, res) => {
    // const lists = []
    db
        .collection('lists')
        .findOne({ _id: new ObjectId(req.params.id) })
        .then((doc)=>{
            res
                .status(200)
                .json(doc.Array)
        })
        .catch(()=> handleError(res, 'Something went wrong.'))

})

app.get('/lists/:vallue', (req, res) => {
    if(ObjectId.isValid(req.params.vallue)){
        db
            .collection('lists')
            .findOne({ _id: new ObjectId(req.params.vallue) })
            .then((doc)=>{
                res
                    .status(200)
                    .json(doc)
            })
            .catch(()=> handleError(res, 'Something went wrong.'))

    } else {

        // handleError(res, 'Wrong id')

        db
            .collection('lists')
            .findOne({name:req.params.vallue})
            .then(doc => {
                if(doc){
                    res.json({message: `Имя ${req.params.vallue} занято`,
                    data:doc})
                } else {
                    res.status(404).json({ message: `Список с именем ${req.params.vallue} не найден.` })
                }
            })
            .catch(()=> handleError(res, 'Something went wrong.'))

    }
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

app.patch('/lists/:name', (req, res)=>{

    // if(ObjectId.isValid(req.params.id)){
        db
            .collection('lists')
            .updateMany({ name: req.params.name }, {  $push: { Array: req.body } } )
            .then((result)=>{
                res
                    .status(200)
                    .json(result)
            })
            .catch(()=> handleError(res, 'Something went wrong.'))

    // } else {
    //     handleError(res, 'Del.Wrong id')
    // }
})




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
