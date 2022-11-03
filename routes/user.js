var express = require("express");
var router = express.Router();
const userHelper = require("../helpers/user_helpers"); //user collection
const adminHelper = require("../helpers/admin_helpers"); //admin collection
const productHelper = require("../helpers/product_helpers"); //product collection
var paypal = require('paypal-rest-sdk');
const cupon_helpers = require("../helpers/cupon_helpers");
const { Db } = require("mongodb");
require("dotenv").config();
// twilio otp verification
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
paypal.configure({
	'mode': 'sandbox', //sandbox or live
	'client_id': process.env.PAYPAL_CLIENT_ID,
	'client_secret': process.env.PAYAPL_SECRET
  });

message = false;
// GET USER LOGIN
router.get("/", isUserLoggedIn, async (req, res) => {
	let cartCount = await userHelper.getCartCount(req.session.user._id);
	let user = await userHelper.getUser(req.session.user.email);
	
	let address = await userHelper.findUserAddress(req.session.user._id);

	res.render("user/user-pannel", { user, cartCount, address });
});
/* GET user login. */
router.get("/login", isUserNotLoggedIn, function (req, res, next) {
	message = false;
	res.render("user/login");
});
router.post("/login", (req, res) => {
	// /user pasword ligin
	userHelper.doLogin(req.body).then((response) => {
		if (response.status) {
			req.session.userloggedIn = true;
			req.session.user = response.user;
			res.redirect("/");
		} else {
			res.render("errors/login-error");
		}
	});
});
router.get("/otpLogin", (req, res) => {
	res.render("user/otpLogin");
});
// post user login
router.post("/otplogin", (req, res) => {
	// {{--/user otp login--}}

	userHelper.doOtpLogin(req.body).then((response) => {
		if (response.status) {
			client.verify.v2
				.services(process.env.TWILIO_SERVICE_SID)
				.verifications.create({ to: response.user.phone, channel: "sms" })
				.then((data) => {
					console.log("otp has been sent");
				});
			req.session.user = response.user;
			res.redirect("/user/verify");
		} else {
			res.render("errors/login-error");
		}
	});
});
router.get("/verify", (req, res) => {
	res.render("user/verify");
});
router.post("/verify", async (req, res) => {
	await client.verify.v2
		.services(process.env.TWILIO_SERVICE_SID)
		.verificationChecks.create({
			to: req.session.user.phone,
			code: req.body.otpCode,
		})
		.then((verification_check) => {
			
			if (verification_check.status == "approved") {
				req.session.userloggedIn = true;
				res.redirect("/");
			} else {
				req.session.user = null;
				res.render("errors/login-error");
			}
		});
});
// GET user register page
router.get("/signup", isUserNotLoggedIn, (req, res) => {

	res.render("user/register", { message });
});
// POST user register
router.post("/register", isUserNotLoggedIn, (req, res) => {
	// check for existing user

	userHelper.checkUser(req.body).then((check) => {
		if (!check) {
			// adds the user
			userHelper.doSignup(req.body).then((response) => {
		userHelper.applyRefferel(req.body);
				
				message = false;
				res.redirect("/user/login");
			});
		} else {
			// incase user already exists
			message = true;
			res.redirect("/user/signup");
		}
	
	});
});
//logout users
router.get("/logout", isUserLoggedIn, (req, res) => {
	req.session.userloggedIn = false;
	req.session.user = null;
	res.redirect("/");
});
//cart
router.get("/cart", isUserLoggedIn, async (req, res) => {
	let total = await userHelper.getTotal(req.session.user._id);
	let cartCount = await userHelper.getCartCount(req.session.user._id);
	let user = req.session.user;
	let prod = await userHelper.getCart(req.session.user._id);
	
	// prod = prod;
	res.render("user/cart", { prod, user, cartCount, total });
});
router.get("/addToCart/:id", isUserLoggedIn, (req, res) => {

	userHelper.addToCart(req.params.id, req.session.user._id).then((responsce) => {
		res.json(responsce);
	});
});
router.post("/changeProductQuantity", (req, res, next) => {


	userHelper.chnageProductQuantity(req.body).then(async (responce) => {
		res.json(responce);
	});
});
router.get("/checkout", isUserLoggedIn, async (req, res) => {
	let prod = await userHelper.getCart(req.session.user._id);

	if (prod[0]) {
		let total = await userHelper.getTotal(req.session.user._id);

		let user = req.session.user;
		let address = await userHelper.findUserAddress(user._id);
		res.render("user/checkout", { user, address, total, prod });
	} else {
		res.redirect("/user/cart");
	}
});
router.get("/addAddress", isUserLoggedIn, (req, res) => {
	let user = req.session.user;
	res.render("user/addAddress", { user });
});

router.post("/addAddress", (req, res) => {

	userHelper.addUserAddress(req.body).then((response) => {
		res.redirect("/user");
	});
});
router.post("/checkout", async (req, res) => {
	let products = await userHelper.getProductList(req.body.userId);
	let total = await userHelper.getTotal(req.body.userId);
	if(req.body.cupon){
		var cuponRate = await cupon_helpers.findcupon(req.body.cupon)
	}else{
		var cuponRate = 0;
	}
	
	let first = total[0].total
	total[0].total = parseInt((total[0].total/100)*(100-cuponRate))

	let address = await userHelper.findSingleAddress(req.body.addressline);

	let prod = userHelper.placeOrder(req.body, products, total, address,first,cuponRate).then((responce) => {
		let order = responce
		if(req.body.payment == 'cod'){
			console.log("responce")
			res.json({ success: true,order:responce });
		}else if(req.body.payment == 'razopay'){
			console.log("razopy payment is online")
			userHelper.generateRazopay(responce,total).then((responce)=>{
				
				responce.route = 'razo'
				res.json(responce)
				
			})
		}else if(req.body.payment == 'paypal'){
			
			let tot = Math.ceil((total[0].total)/80) 
	
			req.session.totoal = tot
			req.session.order = responce
			console.log('paypal payment is online')
			const create_payment_json = {
				"intent": "sale",
				"payer": {
					"payment_method": "paypal"
				},
				"redirect_urls": {
					"return_url": "http://localhost:3000/user/Sucess",
					"cancel_url": "http://localhost:3000/user/orderCansel"
				},
				"transactions": [{
					
					"amount": {
						"currency": "USD",
						"total": tot
					},
					"description": "This is the payment description."
				}]
			};
			
			paypal.payment.create(create_payment_json, function (error, payment) {
				if (error) {
				console.log(error) ;
				} else {
			
					for(let i=0;i<payment.links.length;i++){
						if(payment.links[i].rel ==='approval_url'){
						
							res.json({route:'pal',serc:payment.links[i].href})
							console.log('passed it')
						}else{
							console.log("change it")
						}
					}
				}
			});

		}else if(req.body.payment == 'wallet'){
			let balance = userHelper.checkBalance(req.body.userId,total)
			if(balance){
				res.json({route:'wallet',resp:true,responce})
			}else{
				res.json({route:'wallet',resp:false,responce})
			}
			// 
		}
		
	});
	
});
router.get('/Sucess',(req,res)=>{
	const payerId = req.query.PayerID
	const tocken = req.query.token
	const paymentId = req.query.paymentId
	const total = req.session.totoal
	const order = req.session.order
	
	const execute_payment_json = {
		"payer_id": payerId,
		"transactions": [{
			"amount": {
				"currency": "USD",
				"total": total.toString()
			}
		}]
	};
	paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
		if (error) {
			console.log(error.response);
			throw error;
		} else {
			console.log("Get Payment Response");
			
			userHelper.changePaymentStatus(order).then(()=>{
				res.redirect('/user/orderSucess?order='+order)
			})
			
		}
	});
	 
	
})
router.get("/orderSucess", isUserLoggedIn,async (req, res) => {
	let user = req.session.user
	let order= await userHelper.getSingleOrder(req.query.order)

	res.render("sucess/orderSucess",{user,order});
});
router.get("/allorders", isUserLoggedIn, async (req, res) => {
	let orders = await userHelper.userOrders(req.session.user._id);
	let user = req.session.user;
	res.render("user/allOrders", { orders, user });
});
router.get("/viewOrderDetails/:id", isUserLoggedIn, async (req, res) => {
	let user = req.session.user;
	let orderId = req.params.id;
	await userHelper.returnValidity(orderId);
	let address = await userHelper.getSingleOrder(orderId);
	let orderDetails = await userHelper.getOrderProducts(orderId);
	res.render("user/order-details", { orderDetails, user, address });
});
router.get("/cancelOrder/:id",async (req, res) => {



	let orderId = req.params.id;
	userHelper.cancelOrder(orderId);
	let user = await userHelper.returnCash(orderId)
	productHelper.resetQuantity(orderId)
	res.redirect("/user/allOrders");
});
router.post("/removeFromCart", (req, res) => {

	userHelper.removeCartProduct(req.body).then(async (responce) => {
		res.json(responce);
	});
	// res.redirect('/user/cart')
});
router.get("/edituser", isUserLoggedIn, (req, res) => {
	let user = req.session.user;
	res.render("user/edit-user", { user });
});
router.post("/edituser", (req, res) => {

	userHelper.editUser(req.body);
	res.redirect("/user");
});
router.get("/confirmUser", isUserLoggedIn, (req, res) => {
	let user = req.session.user;
	res.render("user/confirm-user", { user });
});
router.post("/confirmUser", (req, res) => {
	userHelper.confirmPassword(req.body).then((responce) => {
		if (responce) {
			res.redirect("/user/changePassword");
		} else {
			res.render("errors/confirmation-error");
		}
	});

});
router.get("/changePassword", isUserLoggedIn, (req, res) => {
	let user = req.session.user;

	res.render("user/change-password", { user });
});
router.post("/changePassword", (req, res) => {
	userHelper.cahngePassword(req.body).then(() => {
		res.redirect("/user");
	});
});
router.post('/verify-payment',(req,res)=>{
	console.log("this is verify")
	userHelper.verifyPayment(req.body).then(()=>{
		console.log('payment was a success')
		userHelper.changePaymentStatus(req.body.responce.receipt).then(()=>{
			console.log("true")
			res.json({status:true,order:req.body.responce.receipt})
		})
	}).catch((err)=>{
		console.log(err,"payment failure")
		res.json({status:false})
	})
})
router.get('/wishlist',isUserLoggedIn,async(req,res)=>{
	let user = req.session.user
	let prod = await userHelper.getWishlist(req.session.user._id);

 res.render('user/wishlist',{user,prod})
})
router.get('/addToWishlist',(req,res)=>{
	let user = req.session.user
	if(!user){
		res.json({status:false})
	}

	userHelper.addToWishlist(user,req.query.prod).then((responsce) => {
		res.json({status:true});
	});
})
router.post('/removeFromWishlist',(req,res)=>{
	userHelper.removeFromWishlist(req.body).then(async (responce) => {
		res.json(responce);
	});
})
router.get('/returnOrder',async (req,res)=>{
	let orderId = req.query.orderId
	let user = req.session.user
	let users = await userHelper.returnOrder(orderId,user)
	req.session.user = users
	res.redirect('/user/allOrders')
})
router.post('/applyCupon',async(req,res)=>{
	let cuponRate = await cupon_helpers.findcupon(req.body.code)
	let final = parseInt((req.body.total/100)*(100-cuponRate))
	console.log(cuponRate,final)
	res.json({status:true,cuponRate,final})
})






// to check if the user is logged in
function isUserLoggedIn(req, res, next) {
	if (req.session.userloggedIn) {
		next();
	} else {
		res.redirect("/user/login");
	}
}
// to check if the user is not logged in
function isUserNotLoggedIn(req, res, next) {
	if (req.session.userloggedIn) {
		res.redirect("/user");
	} else {
		next();
	}
}
module.exports = router;
