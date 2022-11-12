const mongoClient = require('mongodb').MongoClient
const state={
    db:null,
}

module.exports.connect = (done)=>{
    const url = 'mongodb+srv://amalvinod:EyGdkpL3NAClNLSu@atlascluster.lhokymm.mongodb.net/?retryWrites=true&w=majority'
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