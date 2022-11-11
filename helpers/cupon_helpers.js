const db = require("../config/connection");
const collection = require("../config/collection");

const objectId = require("mongodb");

require("dotenv").config();
require("dotenv").config();

module.exports = {
    addCupon:(data)=>{
        return new Promise(async(resolve,reject)=>{
            let check = await db.get().collection(collection.COMMON_CUPON_COLLECTION).find({offerName:data.cuponName}).toArray()
            
            if(check[0]){
                resolve(false)
            }else{
                await db.get().collection(collection.COMMON_CUPON_COLLECTION).insertOne({
                    offerName:data.cuponName,
                    offerRate:data.offerRate,
                    cuponCode:"techPark-"+ data.cuponName+"-"+data.offerRate,
                    amountAplicable:data.aplicableAmount,
                    maxAmount:data.maxAmount,
                    users:[],
                })
                resolve(true)
            }
            
        })
    },
    getAllCupon:()=>{
        return new Promise(async(resolve,reject)=>{
            let cupons = await db.get().collection(collection.COMMON_CUPON_COLLECTION).find().toArray()
            resolve(cupons)
        })
    },
    getCuponDetails:(cuponId)=>{
        return new Promise(async(resolve,reject)=>{
            let cupon = await db.get().collection(collection.COMMON_CUPON_COLLECTION).findOne({_id:objectId.ObjectId(cuponId)})
            resolve(cupon)
        })
    },
    editCupon:(data)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.COMMON_CUPON_COLLECTION).updateOne({_id:objectId.ObjectId(data.id)},{
                $set:{
                    offerName:data.cuponName,
                    offerRate:data.offerRate,
                    cuponCode:"tecPark-"+data.cuponName+"-"+data.offerRate,
                    amountAplicable:data.aplicableAmount,
                    maxAmount:data.maxAmount,
                }
            })
            resolve()
        })
        
    },
    findcupon:(cupcode)=>{
        return new Promise(async(resolve,reject)=>{
            let cupon = await db.get().collection(collection.COMMON_CUPON_COLLECTION).findOne({cuponCode:cupcode})
            if(cupon){
                resolve(cupon)
            }else{
                resolve(0)
            }
            
        })
    },
    deleteCupon:(cuponId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.COMMON_CUPON_COLLECTION).remove({_id:objectId.ObjectId(cuponId)})
            resolve()
        })
    },
    addProductOffer:(data)=>{
        return new Promise((resolve,reject)=>{
            if(data.offerRate == 0){
                checker = false
            }else{
                checker = true
            }
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId.ObjectId(data.prodId)},{
                $set:{
                    offerRate:parseInt(data.offerRate),
                    isProductOfferActive:checker,
                }
            })
            resolve()
        })
    },
    
};
