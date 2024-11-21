const express = require('express');
const { connectToDb, getDb } = require('./db');

const PORT = 3000;

const app = express();

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


app.get('/lists', (req, res) => {
    const lists = []

    db
        .collection('lists')
        .find()
        .forEach((list)=>{lists.push(list)})
        .then(()=>{
            res
                .status(200)
                .json(lists)
        })
    
})