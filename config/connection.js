const mongoClient = require('mongodb').MongoClient
require("dotenv").config();
const state={
    db:null,
}

module.exports.connect = (done)=>{
    const url = process.env.ATLAS_QUERRY
    const dbName = 'techPark';
    mongoClient.connect(url,(err,data)=>{
        if(err) return done(err)
        state.db = data.db(dbName)
        done()
    })
    
}
module.exports.get = ()=>{
    return state.db

}