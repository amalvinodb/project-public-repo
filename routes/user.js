var express = require("express");
var router = express.Router();
const userHelper = require("../helpers/user_helpers"); //user collection

const productHelper = require("../helpers/product_helpers"); //product collection
var paypal = require("paypal-rest-sdk");
const cupon_helpers = require("../helpers/cupon_helpers");

require("dotenv").config();
// twilio otp verification
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
paypal.configure({
	mode: "sandbox", //sandbox or live
	client_id: process.env.PAYPAL_CLIENT_ID,
	client_secret: process.env.PAYAPL_SECRET,
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
	let loginError = req.session.loginError;
	req.session.loginError = false;
	res.render("user/login", { loginError });
});
router.post("/login", (req, res) => {
	// /user pasword ligin
	userHelper.doLogin(req.body).then((response) => {
		if (response.status) {
			req.session.userloggedIn = true;
			req.session.user = response.user;
			res.redirect("/");
		} else {
			req.session.loginError = true;
			res.redirect("/user/login");
		}
	});
});
router.get("/otpLogin", (req, res) => {
	req.session.user = null;
	let error = req.session.emailError;
	req.session.emailError = false;
	res.render("user/otpLogin", { error });
});
// post user login
router.post("/otplogin", (req, res) => {
	// {{--/user otp login--}}

	userHelper.doOtpLogin(req.body).then((response) => {
		if (response.status) {
			client.verify.v2
				.services(process.env.TWILIO_SERVICE_SID)
				.verifications.create({ to: "+918136909633", channel: "sms" })
				.then((data) => {
				
				})
				.catch((err) => {
					console.log(err);
				});
			req.session.user = response.user;
			res.redirect("/user/verify");
		} else {
			req.session.emailError = true;
			res.redirect("/user/otpLogin");
		}
	});
});
router.get("/verify", (req, res) => {
	if (req.session.user) {
		let error = req.session.otpVarification;
		req.session.otpVarification = false;
		res.render("user/verify", { error });
	} else {
		res.redirect("/user/login");
	}
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
				req.session.otpVarification = true;
				res.redirect("/user/verify");
			}
		})
		.catch((err) => {
			req.session.otpVarification = true;
			res.redirect("/user/verify");
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
		res.json({ status: true });
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
	if (req.body.cupon) {
		var cupon = await cupon_helpers.findcupon(req.body.cupon);
	}

	let first = total[0].total;
	let rate = 0;
	if (cupon) {
		rate = cupon.offerRate;
		if (first > cupon.amountAplicable) {
			let temp = parseInt((total[0].total / 100) * cupon.offerRate);
			if (temp < cupon.maxAmount) {
				total[0].total = parseInt(total[0].total - temp);
			} else {

				total[0].total = parseInt(total[0].total - cupon.maxAmount);
			}
		}
	}

	let user = req.session.user;
	let address = await userHelper.findSingleAddress(req.body.addressline);

	let prod = userHelper.placeOrder(req.body, user, total, address, first, rate).then(async (responce) => {
		let order = responce;
		if (req.body.payment == "cod") {
		
			userHelper.deleteCart(req.body.userId);
			res.json({ success: true, order: responce });
		} else if (req.body.payment == "razopay") {
			
			userHelper.generateRazopay(responce, total).then((responce) => {
				responce.route = "razo";
				res.json(responce);
			});
		} else if (req.body.payment == "paypal") {
			let tot = Math.ceil(total[0].total / 80);

			req.session.totoal = tot;
			req.session.order = responce;
			
			const create_payment_json = {
				intent: "sale",
				payer: {
					payment_method: "paypal",
				},
				redirect_urls: {
					return_url: "http://localhost:3000/user/Sucess",
					cancel_url: "http://localhost:3000/user/orderCansel",
				},
				transactions: [
					{
						amount: {
							currency: "USD",
							total: tot,
						},
						description: "This is the payment description.",
					},
				],
			};

			paypal.payment.create(create_payment_json, function (error, payment) {
				if (error) {
					console.log(error);
				} else {
					for (let i = 0; i < payment.links.length; i++) {
						if (payment.links[i].rel === "approval_url") {
							res.json({ route: "pal", serc: payment.links[i].href });
						
						} else {
							
						}
					}
				}
			});
		} else if (req.body.payment == "wallet") {
			let balance = await userHelper.checkBalance(req.body.userId, total);

			if (balance) {
				userHelper.deleteCart(req.body.userId);
				userHelper.changePaymentStatus(responce);
				res.json({ route: "wallet", resp: true, id:responce });
			} else {
				res.json({ route: "wallet", resp: false, id:responce });
			}
			//
		}
	});
});
router.get("/Sucess", (req, res) => {
	const payerId = req.query.PayerID;
	const tocken = req.query.token;
	const paymentId = req.query.paymentId;
	const total = req.session.totoal;
	const order = req.session.order;
	let userId = req.session.user._id;
	userHelper.deleteCart(userId);
	const execute_payment_json = {
		payer_id: payerId,
		transactions: [
			{
				amount: {
					currency: "USD",
					total: total.toString(),
				},
			},
		],
	};
	paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
		if (error) {
		
			throw error;
		} else {
		

			userHelper.changePaymentStatus(order).then(() => {
				res.redirect("/user/orderSucess?order=" + order);
			});
		}
	});
});
router.get("/orderSucess", isUserLoggedIn, async (req, res) => {
	let user = req.session.user;

	let orderId = req.query.order;

	let order = await userHelper.getSingleOrder(orderId);
	res.render("sucess/orderSucess", { user, order });
});
router.get("/allorders", isUserLoggedIn, async (req, res) => {
	let cartCount = await userHelper.getCartCount(req.session.user._id);
	await userHelper.removeInvalidOrders();
	let orders = await userHelper.userOrders(req.session.user._id);
	let user = req.session.user;
	res.render("user/allOrders", { orders, user, cartCount });
});
router.get("/viewOrderDetails/:id", isUserLoggedIn, async (req, res) => {
	let user = req.session.user;
	let orderId = req.params.id;
	await userHelper.returnValidity(orderId);
	let order = await userHelper.getSingleOrder(orderId);

	res.render("user/order-details", { user, order, orderId });
});
router.get("/cancelOrder/:id", async (req, res) => {
	let orderId = req.params.id;
	await userHelper.cancelOrder(orderId);
	let user = await userHelper.returnCash(orderId);
	await userHelper.cancelAllProducts(orderId);
	await productHelper.resetQuantity(orderId);
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
router.post("/verify-payment", (req, res) => {

	let user = req.session.user._id;
	userHelper
		.verifyPayment(req.body)
		.then(() => {
		
			userHelper.changePaymentStatus(req.body.responce.receipt).then(() => {
				userHelper.deleteCart(user);
			
				res.json({ status: true, order: req.body.responce.receipt });
			});
		})
		.catch((err) => {
			console.log(err);
			console.log(err, "payment failure");
			res.json({ status: false });
		});
});
router.get("/wishlist", isUserLoggedIn, async (req, res) => {
	let cartCount = await userHelper.getCartCount(req.session.user._id);
	let user = req.session.user;
	let prod = await userHelper.getWishlist(req.session.user._id);

	res.render("user/wishlist", { user, prod, cartCount });
});
router.get("/addToWishlist", (req, res) => {
	let user = req.session.user;

	if (!user) {
		res.json({ status: false });
	} else {
		userHelper.addToWishlist(user, req.query.prod).then((responsce) => {
			res.json({ status: true });
		});
	}
});
router.post("/removeFromWishlist", (req, res) => {
	userHelper.removeFromWishlist(req.body).then(async (responce) => {
		res.json(responce);
	});
});
router.get("/returnOrder", async (req, res) => {
	let orderId = req.query.orderId;
	let user = req.session.user;
	let users = await userHelper.returnOrder(orderId, user);
	let usere = await userHelper.returnCash(orderId);
	await userHelper.returnAllProducts(orderId);
	req.session.user = users;
	res.redirect("/user/allOrders");
});
router.post("/applyCupon", async (req, res) => {
	let cupon = await cupon_helpers.findcupon(req.body.code);
	let chk = true;

	let final = req.body.total;
	let rate = 0;
	if (req.body.total > parseInt(cupon.amountAplicable)) {
		let temp = parseInt((req.body.total / 100) * cupon.offerRate);
		if (temp < cupon.maxAmount) {
			rate = parseInt(cupon.offerRate);
			final = parseInt(req.body.total - temp);
		} else {
			rate = parseFloat(cupon.maxAmount / (req.body.total / 100));
			final = parseInt(req.body.total - cupon.maxAmount);
		}
	}

	res.json({ status: true, rate, final });
});

router.post("/cancelProduct", async (req, res) => {
	let order = await userHelper.getSingleOrder(req.body.order);
	let user = req.session.user;
	if (order.discountRate != 0) {
		res.json({ status: false });
	} else {
		await userHelper.cancelProduct(req.body, user);
		await userHelper.checkOrderStatus();
		res.json({ status: true });
	}
});
router.post("/returnProduct", async (req, res) => {
	let order = await userHelper.getSingleOrder(req.body.order);
	let user = req.session.user;
	if (order.discountRate != 0) {
		res.json({ status: false });
	} else {
		await userHelper.returnProduct(req.body, user);
		await userHelper.checkOrderStatus();
		res.json({ status: true });
	}
});
router.get('/wallet',isUserLoggedIn,async(req,res)=>{
	let cartCount = await userHelper.getCartCount(req.session.user._id);
	let user = await userHelper.findUser(req.session.user._id)
	res.render('user/wallet',{user,cartCount})
})
router.post('/editAddress',async(req,res)=>{

	await userHelper.editAddress(req.body)
	res.json({
		status:true
	})
})
router.post('/modalLogin',async(req,res)=>{

	let data = await userHelper.doLogin(req.body)
	if(data.status){
		req.session.user = data.user
		req.session.userloggedIn = true
		res.json({status:true})
	}else{
		res.json({status:false})
	}
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
