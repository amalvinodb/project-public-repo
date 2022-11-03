const db = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcrypt");
const objectId = require("mongodb");
const { ConversationList } = require("twilio/lib/rest/conversations/v1/conversation");
module.exports = {
	addCatagory: (catagory) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.CATAGORY_COLLECTION)
				.insertOne(catagory)
				.then((response) => {
					resolve(catagory);
				});
		});
	},
	deleteCatagory: (productId) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.CATAGORY_COLLECTION)
				.remove({ _id: objectId.ObjectId(productId) })
				.then(() => {
					resolve();
				});
		});
	},

	getAllCatagories: () => {
		return new Promise(async (resolve, reject) => {
			let users = await db.get().collection(collection.CATAGORY_COLLECTION).find().toArray();
			resolve(users);
		});
	},
	checkCatagory: (userData) => {
		return new Promise(async (resolve, reject) => {
			present = db.get().collection(collection.CATAGORY_COLLECTION).findOne({ catagoryName: userData.catagoryName });
			resolve(present);
		});
	},
	getOneCatagory: (prodId) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.CATAGORY_COLLECTION)
				.findOne({ _id: objectId.ObjectId(prodId) })
				.then((response) => {
					resolve(response);
				});
		});
	},
	updateCatagory: (prodId, prodDetails) => {
		return new Promise(async (resolve, reject) => {
			let prods = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.find({ catagory: objectId.ObjectId(prodId) })
				.toArray();
			for (let i = 0; i < prods.length; i++) {
				
				if (prods[i].offerRate <= prodDetails.catagoryOffer) {
				
					let activeOffer = prodDetails.catagoryOffer;
					const body = {
						offerPrice: parseInt((prods[i].price / 100) * (100 - activeOffer)),
						activeOfferOfProduct: activeOffer,
					};
					await db
						.get()
						.collection(collection.PRODUCT_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(prods[i]._id) },
							{
								$set: {
									offerPrice: body.offerPrice,
									activeOffer: body.activeOfferOfProduct,
								},
							}
						);
				}else{
			
					let activeOffer = prods[i].offerRate;
					const body = {
						offerPrice: parseInt((prods[i].price / 100) * (100 - activeOffer)),
						activeOfferOfProduct: activeOffer,
					};
					await db
						.get()
						.collection(collection.PRODUCT_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(prods[i]._id) },
							{
								$set: {
									offerPrice: body.offerPrice,
									activeOffer: body.activeOfferOfProduct,
								},
							}
						);
				}
			}
			
			db.get()
				.collection(collection.CATAGORY_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(prodId) },
					{
						$set: {
							catagoryName: prodDetails.catagoryName,
							catagoryDetail: prodDetails.catagoryDetail,
							catagoryOffer: prodDetails.catagoryOffer,
						},
					}
				)
				.then((user) => {
					resolve();
				});
		});
	},
	checkForProduct: (catagoryId) => {
		return new Promise(async (resolve, reject) => {
			let users = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.find({ catagory: objectId.ObjectId(catagoryId) })
				.toArray();
			resolve(users);
		});
	},
	addCatagoryOffer:(data)=>{
		return new Promise((resolve,reject)=>{
			if(data.offerRate == 0){
				checker = false
			}else(
				checker = true
			)
			db.get().collection(collection.CATAGORY_COLLECTION).updateOne({_id:objectId.ObjectId(data.prodId)},{
				$set:{
					catagoryOfferRate:parseInt(data.offerRate),
					isOffer:checker,
				}
			})
		resolve()
		
		})
	},
	getValidCatagories:()=>{
		return new Promise(async(resolve,reject)=>{
			let catagories = await db.get().collection(collection.CATAGORY_COLLECTION).find({isOffer:true}).toArray()
			resolve(catagories)
		})
		
	}
};
