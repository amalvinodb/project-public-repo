const db = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcrypt");
const objectId = require("mongodb");
require("dotenv").config();
const Razorpay = require("razorpay");
const moment = require("moment");
require("dotenv").config();
var instance = new Razorpay({
	key_id: process.env.RAZO_KEY_ID,
	key_secret: process.env.RAZO_SECRET_KEY,
});
present = null;
module.exports = {
	doSignup: (userData) => {
		return new Promise(async (resolve, reject) => {
			userData.password = await bcrypt.hash(userData.password, 10);
			today = new Date();
			now = moment(today).format("YYYY-MM-DD");
			let code = "techpark_" + userData.Name + "_100";
			userData.phone = "+91" + userData.phone;
			db.get()
				.collection(collection.USER_COLLECTION)
				.insertOne({
					Name: userData.Name,
					email: userData.email,
					password: userData.password,
					phone: userData.phone,
					userStatus: userData.userStatus,
					date: now,
					wallet: parseInt(0),
					walletHistory: [],
					referalCode: code,
				})
				.then((data) => {
					resolve(userData);
				});
		});
	},
	checkUser: (userData) => {
		return new Promise(async (resolve, reject) => {
			present = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email });
			userName = await db.get().collection(collection.USER_COLLECTION).findOne({ Name: userData.Name });
			if (present || userName) {
			
				resolve(true);
			} else {
			
				resolve(false);
			}
		});
	},
	doLogin: (userData) => {
		return new Promise(async (resolve, reject) => {
			let loginStatus = false;
			let response = {};
			let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email });
			if (user && user.userStatus) {
				await bcrypt.compare(userData.password, user.password).then((status) => {
					if (status) {
			
						response.user = user;
						response.status = true;
						resolve(response);
					} else {
				
						resolve({ status: false });
					}
				});
			} else {
			
				resolve({ status: false });
			}
		});
	},
	doOtpLogin: (userdata) => {
		let response = {};
		return new Promise(async (resolve, reject) => {
			let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userdata.email });
			if (user && user.userStatus) {
				response.status = true;
				response.user = user;
			} else {
				response.status = false;
				response.user = null;
			}
			resolve(response);
		});
	},
	addToCart: (prodId, userId) => {
		let prodObj = {
			item: objectId.ObjectId(prodId),
			quantity: 1,
		};
		return new Promise(async (resolve, reject) => {
			let user = await db
				.get()
				.collection(collection.CART_COLLECTION)
				.findOne({ user: objectId.ObjectId(userId) });
			if (user) {
				let prodExist = user.products.findIndex((product) => product.item == prodId);

				if (prodExist != -1) {
					db.get()
						.collection(collection.CART_COLLECTION)
						.updateOne(
							{ user: objectId.ObjectId(userId), "products.item": objectId.ObjectId(prodId) },
							{
								$inc: { "products.$.quantity": 1 },
							}
						)
						.then((response) => {
							resolve();
						});
				} else {
					db.get()
						.collection(collection.CART_COLLECTION)
						.updateOne(
							{ user: objectId.ObjectId(userId) },
							{
								$push: { products: prodObj },
							}
						)
						.then((responce) => {
							
							resolve();
						});
				}
			} else {
				let cartObj = {
					user: objectId.ObjectId(userId),
					products: [prodObj],
				};
				db.get()
					.collection(collection.CART_COLLECTION)
					.insertOne(cartObj)
					.then((responce) => {
						
						resolve();
					});
			}
		});
	},
	getCart: (userId) => {
		return new Promise((resolve, reject) => {
			let cartItems = db
				.get()
				.collection(collection.CART_COLLECTION)
				.aggregate([
					{
						$match: { user: objectId.ObjectId(userId) },
					},
					{
						$unwind: "$products",
					},
					{
						$project: {
							item: "$products.item",
							quantity: "$products.quantity",
						},
					},
					{
						$lookup: {
							from: collection.PRODUCT_COLLECTION,
							localField: "item",
							foreignField: "_id",
							as: "product",
						},
					},
					{
						$project: {
							item: 1,
							quantity: 1,
							product: {
								$arrayElemAt: ["$product", 0],
							},
						},
					},
				])
				.toArray();

			resolve(cartItems);
		});
	},
	getCartCount: (userId) => {
		return new Promise(async (resolve, reject) => {
			let user = await db
				.get()
				.collection(collection.CART_COLLECTION)
				.findOne({ user: objectId.ObjectId(userId) });
			let count = 0;
			if (user) {
				count = user.products.length;
			}
			resolve(count);
		});
	},
	chnageProductQuantity: (details) => {
		details.count = parseInt(details.count);
		details.quantity = parseInt(details.quantity);

		return new Promise((resolve, reject) => {
			if (details.count == -1 && details.quantity == 1) {
				db.get()
					.collection(collection.CART_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(details.cart) },
						{
							$pull: { products: { item: objectId.ObjectId(details.product) } },
						}
					)
					.then((respnce) => {
						resolve({ removeProduct: true });
					});
			} else {
				db.get()
					.collection(collection.CART_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(details.cart), "products.item": objectId.ObjectId(details.product) },
						{
							$inc: { "products.$.quantity": details.count },
						}
					)
					.then((response) => {
						resolve({ removeProduct: false });
					});
			}
		});
	},

	findUserAddress: (user) => {
		return new Promise(async (resolve, reject) => {
			let users = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: user }).toArray();
			resolve(users);
		});
	},
	addUserAddress: (data) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.ADDRESS_COLLECTION)
				.insertOne(data)
				.then((responce) => {
					resolve(responce);
				});
		});
	},

	getTotal: (userId) => {
		return new Promise((resolve, reject) => {
			let total = db
				.get()
				.collection(collection.CART_COLLECTION)
				.aggregate([
					{
						$match: { user: objectId.ObjectId(userId) },
					},
					{
						$unwind: "$products",
					},
					{
						$project: {
							item: "$products.item",
							quantity: "$products.quantity",
						},
					},
					{
						$lookup: {
							from: collection.PRODUCT_COLLECTION,
							localField: "item",
							foreignField: "_id",
							as: "product",
						},
					},
					{
						$project: {
							item: 1,
							quantity: 1,
							product: {
								$arrayElemAt: ["$product", 0],
							},
						},
					},
					{
						$group: {
							_id: null,
							total: { $sum: { $multiply: ["$quantity", "$product.offerPrice"] } },
						},
					},
					{
						$project: {
							_id: 0,
							total: 1,
						},
					},
				])
				.toArray();

			resolve(total);
		});
	},
	getProductList: (userId) => {
		return new Promise(async (resolve, reject) => {
			let cart = await db
				.get()
				.collection(collection.CART_COLLECTION)
				.findOne({ user: objectId.ObjectId(userId) });
			resolve(cart.products);
		});
	},
	placeOrder: (order, user, total, address, final, rate) => {
		let today = new Date();
		let now = moment(today).format("YYYY-MM-DD");
		return new Promise(async (resolve, reject) => {
			let produc = [];
			let prod = await db
				.get()
				.collection(collection.CART_COLLECTION)
				.aggregate([
					{
						$match: { user: objectId.ObjectId(order.userId) },
					},
					{
						$unwind: "$products",
					},
					{
						$project: {
							item: "$products.item",
							quantity: "$products.quantity",
						},
					},
					{
						$lookup: {
							from: collection.PRODUCT_COLLECTION,
							localField: "item",
							foreignField: "_id",
							as: "product",
						},
					},
					{
						$project: { item: 1, quantity: 1, product: { $arrayElemAt: ["$product", 0] } },
					},
				])
				.toArray();
			for (i = 0; i < prod.length; i++) {
				let prodId = prod[i].item;

				let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: prodId });
				let cqt = parseInt(product.quantity);
				let chan = parseInt(prod[i].quantity);
				let nqt = cqt - chan;
				await db
					.get()
					.collection(collection.PRODUCT_COLLECTION)
					.update(
						{ _id: prodId },
						{
							$set: {
								quantity: nqt,
							},
						}
					);
				let newProd = {
					_id: prod[i]._id,
					item: prod[i].item,
					quantity: prod[i].quantity,
					canBeReturned: false,
					isShipped: false,
					isDelivered: false,
					isCanseled: false,
					activeStatus: true,
					date: now,
					status: "placed",
					product: prod[i].product,
				};
				produc.push(newProd);
			}
			// resolve(prod)
			let status = order.payment === "cod" ? "placed" : "pending";

			let orderObj = {
				deleveryDetails: address,
				user: order.userId,
				userPhone:user.phone,
				userName: user.Name,
				userEmail: user.email,
				totalPrice: total,
				paymentMethod: order.payment,
				products: produc,
				status: status,
				date: now,
				orderValidity: true,
				firstPrice: final,
				discountRate: rate,
			};
			db.get()
				.collection(collection.ORDER_COLLECTION)
				.insertOne(orderObj)
				.then(async(responce) => {
					// console.log(responce,"data")
					let data = await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId.ObjectId(responce.insertedId)})
					resolve(data)
				});
		});
	},
	findSingleAddress: (add) => {
		return new Promise(async (resolve, reject) => {
			let users = await db
				.get()
				.collection(collection.ADDRESS_COLLECTION)
				.findOne({ _id: objectId.ObjectId(add) });

			resolve(users);
		});
	},
	userOrders: (userId) => {
		return new Promise(async (resolve, reject) => {
			let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ user: userId }).toArray();
			resolve(orders);
		});
	},
	getOrderProducts: (orderId) => {
		return new Promise(async (resolve, reject) => {
			let orderItems = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.find({ _id: objectId.ObjectId(orderId) })
				.toArray();

			resolve(orderItems);
		});
	},
	getSingleOrder: (orderId) => {
		return new Promise(async (resolve, reject) => {
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });

			resolve(order);
		});
	},
	cancelOrder: (orderId) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();
			let now = moment(today).format("YYYY-MM-DD");
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });
			if (order.status != "delivered") {
				let len = order.products.length;
				for (i = 0; i < len; i++) {
					await db
						.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(orderId), "products.item": objectId.ObjectId(order.products[i].item) },
							{
								$set: {
									"products.$.status": "canceled",
									"products.$.activeStatus": false,
									"products.$.isCanseled": true,
									"products.$.cansalationDate": now,
								},
							}
						);
				}
				await db
					.get()
					.collection(collection.ORDER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(orderId) },
						{
							$set: {
								status: "canceled",
								orderValidity: false,
								cancalationDate: now,
							},
						}
					);

				resolve(true);
			}else{
				resolve(false)
			}
		});
	},
	removeCartProduct: (details) => {
	
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.CART_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(details.cart) },
					{
						$pull: { products: { item: objectId.ObjectId(details.product) } },
					}
				)
				.then((respnce) => {
					resolve({ removeProduct: true });
				});
		});
	},
	editUser: (userData) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.USER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(userData.Id) },
					{
						$set: {
							Name: userData.Name,
							phone: userData.phone,
						},
					}
				)
				.then(() => {
					resolve();
				});
		});
	},
	confirmPassword: (data) => {
		return new Promise(async (resolve, reject) => {
			let user = await db
				.get()
				.collection(collection.USER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(data.Id) });

			await bcrypt.compare(data.password, user.password).then((status) => {
				if (status) {
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	},
	cahngePassword: (data) => {
		return new Promise(async (resolve, reject) => {
			await db
				.get()
				.collection(collection.USER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(data.Id) },
					{
						$set: {
							password: await bcrypt.hash(data.password, 10),
						},
					}
				)
				.then(() => {
					resolve();
				});
		});
	},

	generateRazopay: (orderId, total) => {
		let tota = parseInt(total[0].total * 100);

		return new Promise((resolve, reject) => {
			var options = {
				amount: tota.toString(), // amount in the smallest currency unit
				currency: "INR",
				receipt: orderId.toString(),
			};

			instance.orders.create(options, function (err, order) {
				if (err) {
					console.log("an error has occcourred", err);
				} else {
					resolve(order);
				}
			});
		});
	},
	verifyPayment: (details) => {
		return new Promise((resolve, reject) => {
			var crypto = require("crypto");
			var expectedSignature = crypto
				.createHmac("sha256", process.env.RAZO_SECRET_KEY)
				.update(details.payment.razorpay_order_id + "|" + details.payment.razorpay_payment_id)
				.digest("hex");

			if (expectedSignature === details.payment.razorpay_signature) {
				

				resolve();
			} else {

				reject(details.responce.receipt);
			}
		});
	},
	deleteCart: (Id) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.CART_COLLECTION)
				.remove({ user: objectId.ObjectId(Id) });
		});
	},
	changePaymentStatus: (orderId) => {
		console.log(orderId)
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.ORDER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(orderId) },
					{
						$set: {
							payment: "payed the amount",
							status: "placed",
						},
					}
				)
				.then(() => {
					resolve();
				});
		});
	},
	addToWishlist: (users, prod) => {
		let prodObj = {
			item: objectId.ObjectId(prod),
		};
		return new Promise(async (resolve, reject) => {
			let user = await db
				.get()
				.collection(collection.WISHLIST_COLLECTION)
				.findOne({ user: objectId.ObjectId(users._id) });
			if (user) {
				let prodExist = user.products.findIndex((product) => product.item == prod);

				if (prodExist != -1) {
			
					resolve();
				} else {
					db.get()
						.collection(collection.WISHLIST_COLLECTION)
						.updateOne(
							{ user: objectId.ObjectId(users._id) },
							{
								$push: { products: prodObj },
							}
						)
						.then((responce) => {
						
							resolve();
						});
				}
			} else {
				let cartObj = {
					user: objectId.ObjectId(users._id),
					products: [prodObj],
				};
				db.get()
					.collection(collection.WISHLIST_COLLECTION)
					.insertOne(cartObj)
					.then((responce) => {
					
						resolve();
					});
			}
		});
	},
	getWishlist: (userId) => {
		return new Promise((resolve, reject) => {
			let cartItems = db
				.get()
				.collection(collection.WISHLIST_COLLECTION)
				.aggregate([
					{
						$match: { user: objectId.ObjectId(userId) },
					},
					{
						$unwind: "$products",
					},
					{
						$project: {
							item: "$products.item",
							quantity: "$products.quantity",
						},
					},
					{
						$lookup: {
							from: collection.PRODUCT_COLLECTION,
							localField: "item",
							foreignField: "_id",
							as: "product",
						},
					},
					{
						$project: {
							item: 1,
							product: {
								$arrayElemAt: ["$product", 0],
							},
						},
					},
				])
				.toArray();

			resolve(cartItems);
		});
	},
	removeFromWishlist: (details) => {
		return new Promise((resolve, reject) => {
			db.get()
				.collection(collection.WISHLIST_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(details.wish) },
					{
						$pull: { products: { item: objectId.ObjectId(details.product) } },
					}
				)
				.then((respnce) => {
					resolve({ removeProduct: true });
				});
		});
	},
	getUser: (userEmail) => {
		return new Promise(async (resolve, reject) => {
			user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userEmail });
			resolve(user);
		});
	},
	applyRefferel: (code) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();

			let now = moment(today).format("YYYY-MM-DD");
			let exist = await db.get().collection(collection.USER_COLLECTION).findOne({ referalCode: code.refferel });
			if (exist) {
				let history = {
					type: "refferal",
					ammount: 100,
					date: now,
				};
				db.get()
					.collection(collection.USER_COLLECTION)
					.updateOne(
						{ referalCode: code.refferel },
						{
							$set: {
								wallet: parseFloat(exist.wallet) + 100,
							},
							$push: { walletHistory: history },
						}
					);
					
				db.get()
					.collection(collection.USER_COLLECTION)
					.updateOne(
						{ Name: code.Name },
						{
							$set: {
								wallet: 100,
							},
							$push: { walletHistory: history },
						}
					);
			}
			resolve();
		});
	},
	checkBalance: (userId, total) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();
			let now = moment(today).format("YYYY-MM-DD");
			let user = await db
				.get()
				.collection(collection.USER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(userId) });
			if (user.wallet >= total[0].total) {
				let history = {
					type:"purchase",
					date:now,
					ammount:total[0].total,
				}
				await db
					.get()
					.collection(collection.USER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(userId) },
						{
							$set: {
								wallet: parseFloat(user.wallet - total[0].total),
								payment: "payed",
							},
							$push: { walletHistory: history },
						}
					);
				resolve(true);
			} else {
				resolve(false);
			}
		});
	},
	returnValidity: (orderId) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();
			let now = moment(today).format("YYYY-MM-DD");

			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });

			if (order.returnExpairy > now) {
	
			} else {

				await db
					.get()
					.collection(collection.ORDER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(orderId) },
						{
							$set: {
								canBeReturned: false,
							},
						}
					);
			}
			resolve();
		});
	},
	returnOrder: (orderId, user) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();

			let now = moment(today).format("YYYY-MM-DD");
			await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(orderId) },
					{
						$set: {
							return: true,
							status: "returned",
							canBeReturned: false,
						},
					}
				);
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });
			let len = order.products.length;
			for (i = 0; i < len; i++) {
				await db
					.get()
					.collection(collection.ORDER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(orderId), "products.item": objectId.ObjectId(order.products[i].item) },
						{
							$set: {
								"products.$.status": "returned",
								"products.$.activeStatus": false,
								"products.$.isCanseled": true,
								"products.$.returnDate": now,
							},
						}
					);
			}
			let users = await db
				.get()
				.collection(collection.USER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(user._id) });
			resolve(users);
		});
	},
	returnCash: (order) => {
		return new Promise(async (resolve, reject) => {
			let orderdata = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(order) });
			let user = await db
				.get()
				.collection(collection.USER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderdata.user) });

			if (orderdata.payment == "payed the amount") {
			
				await db
					.get()
					.collection(collection.USER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(orderdata.user) },
						{
							$set: {
								wallet: parseInt(user.wallet + orderdata.totalPrice[0].total),
							},
						}
					);
				await db
					.get()
					.collection(collection.ORDER_COLLECTION)
					.updateOne(
						{ _id: objectId.ObjectId(orderdata._id) },
						{
							$set: {
								payment: "returned",
							},
						}
					);
			}
			resolve();
		});
	},
	removeInvalidOrders: () => {
		return new Promise(async (resolve, reject) => {
			await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.remove({ status: "pending", paymentMethod: { $ne: "cod" } });
			resolve();
		});
	},
	cancelProduct: (data, user) => {
		let today = new Date();

		let now = moment(today).format("YYYY-MM-DD");
		return new Promise(async (resolve, reject) => {
			let prod = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.findOne({ _id: objectId.ObjectId(data.prodId) });
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(data.order) });
			
					let len = order.products.length;
					let tot = 0;
					for (i = 0; i < len; i++) {
						if (order.products[i].product._id == data.prodId) {
							tot = parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity));
							let history = {
								type: "cancelation",
								ammount: parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity)),
								date: now,
							};
							if (order.payment == "payed the amount") {
								await db
									.get()
									.collection(collection.USER_COLLECTION)
									.updateOne(
										{ _id: objectId.ObjectId(user._id) },
										{
											$set: {
												wallet: parseInt(user.wallet) + parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity)),
											},
											$push: { walletHistory: history },
										}
									);
							}
						}
					}
					await db
						.get()
						.collection(collection.PRODUCT_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(data.prodId) },
							{
								$set: {
									quantity: parseInt(parseInt(prod.quantity) + parseInt(data.quantity)),
								},
							}
						);
					await db
						.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(data.order), "products.item": objectId.ObjectId(data.prodId) },
							{
								$set: {
									"products.$.status": "canceled",
									"products.$.activeStatus": false,
									"products.$.isCanseled": true,
									"products.$.cancalationDate": now,
								},
							}
						);
					await db
						.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(data.order) },
							{
								$set: {
									"totalPrice.0.total": parseInt(order.totalPrice[0].total) - parseInt(tot),
								},
							}
						);
			
			
			resolve();
		});
	},
	returnProduct: (data, user) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();

			let now = moment(today).format("YYYY-MM-DD");
			let prod = await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.findOne({ _id: objectId.ObjectId(data.prodId) });
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(data.order) });
			let len = order.products.length;
			let tot = 0;
			for (i = 0; i < len; i++) {
				if (order.products[i].product._id == data.prodId) {
					tot = parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity));
					let history = {
						type: "cancelation",
						ammount: parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity)),
						date: now,
					};
					await db
						.get()
						.collection(collection.USER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(user._id) },
							{
								$set: {
									wallet: parseInt(user.wallet) + parseInt(parseInt(order.products[i].product.offerPrice) * parseInt(data.quantity)),
								},
								$push: { walletHistory: history },
							}
						);
				}
			}
			await db
				.get()
				.collection(collection.PRODUCT_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(data.prodId) },
					{
						$set: {
							quantity: parseInt(parseInt(prod.quantity) + parseInt(data.quantity)),
						},
					}
				);

			await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(data.order), "products.item": objectId.ObjectId(data.prodId) },
					{
						$set: {
							"products.$.status": "returned",
							"products.$.activeStatus": false,
							"products.$.canBeReturned": false,
							"products.$.isCanseled": false,
							"products.$.returnDate": now,
						},
					}
				);
			await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.updateOne(
					{ _id: objectId.ObjectId(data.order) },
					{
						$set: {
							"totalPrice.0.total": parseInt(order.totalPrice[0].total) - parseInt(tot),
						},
					}
				);
			resolve();
		});
	},
	checkOrderStatus: () => {
		return new Promise(async (resolve, reject) => {
			let order = await db.get().collection(collection.ORDER_COLLECTION).find().toArray();
			let noOfOrders = order.length;
			for (i = 0; i < noOfOrders; i++) {
				let noOfProducts = order[i].products.length;
				let count = 0;
				for (j = 0; j < noOfProducts; j++) {
					if (order[i].products[j].status == "returned" || order[i].products[j].status == "canceled") {
						count++;
					}
				}
				if (count == noOfProducts) {
					await db
						.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(order[i]._id) },
							{
								$set: {
									status: "canceled",
									orderValidity: false,
								},
							}
						);
				}
			}
			resolve();
		});
	},
	returnAllProducts: (orderId) => {
		let today = new Date();
		let expairy = moment(today).add(7, "days").format("YYYY-MM-DD");
		let now = moment(today).format("YYYY-MM-DD");
		return new Promise(async (resolve, reject) => {
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });
			let len = order.products.length;
			for (i = 0; i < len; i++) {
				if (order.products[i].status != "returned" && order.products[i].status != "canceled") {
					db.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(orderId), "products.item": objectId.ObjectId(order.products[i].item) },
							{
								$set: {
									"products.$.isCanseled": true,
									"products.$.status": "returned",
									"products.$.activeStatus": false,
									"products.$.canBeReturned": false,
									"products.$.returnDate": now,
								},
							}
						);
				}
			}
			resolve();
		});
	},
	cancelAllProducts: (orderId) => {
		return new Promise(async (resolve, reject) => {
			let today = new Date();

			let now = moment(today).format("YYYY-MM-DD");
			let order = await db
				.get()
				.collection(collection.ORDER_COLLECTION)
				.findOne({ _id: objectId.ObjectId(orderId) });
			let len = order.products.length;
			for (i = 0; i < len; i++) {
				if (order.products[i].status != "returned" && order.products[i].status != "canceled") {
					db.get()
						.collection(collection.ORDER_COLLECTION)
						.updateOne(
							{ _id: objectId.ObjectId(orderId), "products.item": objectId.ObjectId(order.products[i].item) },
							{
								$set: {
									"products.$.isCanseled": true,
									"products.$.status": "canceled",
									"products.$.activeStatus": false,
									"products.$.canBeReturned": false,
									"products.$.cancalationDate": now,
								},
							}
						);
				}
			}
			resolve();
		});
	},
	findUser:(id)=>{
		return new Promise(async(resolve,reject)=>{
			let user = await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId.ObjectId(id)})
			resolve(user)
		})
	},
	editAddress:(data)=>{
		return new Promise(async(resolve,reject)=>{
			await db.get().collection(collection.ADDRESS_COLLECTION).updateOne({_id:objectId.ObjectId(data.orderId)},{
				$set:{
					userName:data.username,
					phnumber:data.phnumber,
					pin:data.pin,
					hname:data.hname,
					region:data.region,
					lmk:data.lmk,
					town:data.town,
					state:data.state,
				}
			})
			resolve()
		})
	}
};
