const db = require("../config/connection");
const collection = require("../config/collection");

const objectId = require("mongodb");
module.exports = {
	addProduct: (product) => {
		
		return new Promise(async(resolve,reject)=>{
			let catagoryOffer = await db.get().collection(collection.CATAGORY_COLLECTION).findOne({_id:objectId.ObjectId(product.catagory)})
			
			db.get()
			.collection(collection.PRODUCT_COLLECTION)
			.insertOne({
				catagory: objectId.ObjectId(product.catagory),
				productName: product.productName,
				price: parseInt(product.price),
				discription: product.discription,
				quantity: parseInt(product.quantity),
				offerPrice:parseInt(product.offerPrice) ,
				images:product.images,
				offerRate:parseInt(product.offerRate),
				activeOffer:parseInt(product.activeOfferOfProduct),
				isOfferActive:product.isOfferRate,
			})
			.then((data) => {
				console.log(data)
				resolve(data)
			});
		})
		
	},
	getAllProductsAdmin:()=>{
		return new Promise(async (resolve, reject) => {
			let products = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.aggregate([
					{
						$lookup: {
							from: collection.CATAGORY_COLLECTION,
							localField: "catagory",
							foreignField: "_id",
							as: "result",
						},
					},{ $sort: { productName:1 } }
				])
				// .find()
				.toArray();

			resolve(products);
		});
	},
	getAllProducts: (pg) => {
		let skp = parseInt(pg*8)
		
		return new Promise(async (resolve, reject) => {
			let products = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.aggregate([
					{
						$lookup: {
							from: collection.CATAGORY_COLLECTION,
							localField: "catagory",
							foreignField: "_id",
							as: "result",
						},
					},{ $sort: { productName:1 } }
				]).skip(skp).limit(8)
				// .find()
				.toArray();

			resolve(products);
		});
	},
	deleteProduct: (productId) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.PRODUCT_COLLECTION)
				.remove({ _id: objectId.ObjectId(productId) })
				.then(() => {
					resolve();
				});
		});
	},
	getProductDetails: (prodId) => {
		return new Promise(async (resolve, reject) => {
			let product = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.findOne({ _id: objectId.ObjectId(prodId) });
			resolve(product);
		});
	},
	updateProduct: (data,prod) => {
		return new Promise((resolve,reject)=>{
			if(data.images){
				db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId.ObjectId(prod)},{
					$set:{
						catagory:data.catagory,
						productName:data.productName,
						price:data.price,
						discription:data.discription,
						quantity:data.quantity,
						offerRate:data.offerRate,
						images:data.images,
						discription:data.discription,
					}
				})
				resolve()
			}else{
				db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId.ObjectId(prod)},{
					$set:{
						catagory:data.catagory,
						productName:data.productName,
						price:data.price,
						discription:data.discription,
						quantity:data.quantity,
						offerRate:data.offerRate,
						discription:data.discription,
					}
				})
				resolve()
			}
			
		})
			
	},filterCatagory: (cataId,pg) => {
		let skp = parseInt(pg*8)
		return new Promise(async (resolve, reject) => {
			let users = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.find({ catagory: objectId.ObjectId(cataId) }).skip(skp).limit(8)
				.toArray();
			resolve(users);
		});
	},
	sortCatagory:(sort,page)=>{
		let skp = parseInt(page*8)
		let srt = parseInt(sort)
		return new Promise(async (resolve, reject) => {
			let products = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.aggregate([
					{
						$lookup: {
							from: collection.CATAGORY_COLLECTION,
							localField: "catagory",
							foreignField: "_id",
							as: "result",
						},
					}


				]).sort({"offerPrice":srt}).skip(skp).limit(8)
				// .find()
				.toArray();

			resolve(products);
		});
	},
	filterSortCatagory:(catagory,sort,pg)=>{
		skp = parseInt(pg*8)
		let srt = parseInt(sort)
		return new Promise(async (resolve, reject) => {
			let users = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.find({ catagory: objectId.ObjectId(catagory) }).sort({'offerPrice':srt}).skip(skp).limit(8)
				.toArray();
			resolve(users);
		});
	},
	resetQuantity:(orderId)=>{
		return new Promise(async (resolve, reject) => {
	
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });
			let address = order.products;
			for(i=0;i<address.length;i++){
				let prod =await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:address[i].item})
				let chan = address[i].quantity;
				let cqt = prod.quantity
				let nqt = cqt +chan;
				await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:address[i].item},{
					$set:{
						quantity:nqt,
					}
				})
				
			}
			resolve();
		});
		
	},catagoryCount:(sort)=>{
		let srt = parseInt(sort)
		return new Promise(async (resolve, reject) => {
			let products = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.aggregate([
					{
						$lookup: {
							from: collection.CATAGORY_COLLECTION,
							localField: "catagory",
							foreignField: "_id",
							as: "result",
						},
					},
				]).sort({"offerPrice":srt})
				// .find()
				.toArray();

			resolve(products.length);
		});
	},countAllProducts: () => {
		

		return new Promise(async (resolve, reject) => {
			let products = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION) .find().toArray();

			resolve(products.length);
		});
	},
	countCatagory: (cataId) => {
		return new Promise(async (resolve, reject) => {
			let users = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.find({ catagory: objectId.ObjectId(cataId) })
				.toArray();
			resolve(users.length);
		});
	},

};
