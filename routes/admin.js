var express = require("express");
var multer = require("multer");
var path = require("path");
var router = express.Router();
const userHelper = require("../helpers/user_helpers"); //user collection
const adminHelper = require("../helpers/admin_helpers"); //admin collection
const productHelper = require("../helpers/product_helpers"); //product collection
const { response, rawListeners } = require("../app");
const { PRODUCT_COLLECTION } = require("../config/collection");
const catagory_helpers = require("../helpers/catagory_helpers");
const { cloudinary } = require("../config/cloudnary");
const moment = require("moment");
const cuponHelper = require("../helpers/cupon_helpers");
const { ObjectId } = require("mongodb");
const { ConversationList } = require("twilio/lib/rest/conversations/v1/conversation");
// const upload  = require('../config/multer')

const upload = multer({
	storage: multer.diskStorage({}),
	fileFilter: (req, file, cb) => {
		// The function should call `cb` with a boolean
		// to indicate if the file should be accepted

		let ext = path.extname(file.originalname);
		if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
			// You can always pass an error if something goes wrong:

			cb(new Error("I don't have a clue!"), false);
			return;
		}

		// To accept the file pass `true`, like so:
		cb(null, true);
	},
});

/* GET users listing. */
router.get("/", isAdminLoggedIn, async (req, res, next) => {
	res.redirect("/admin/dashBoard");
});
router.get("/allOrders", isAdminLoggedIn, async (req, res) => {
	await userHelper.removeInvalidOrders()
	let orders = await adminHelper.getAllOrders();

	res.render("admin/admin-orders", { admin: true, orders });
});
// to show the login page
router.get("/login", isAdminNotLoggedIn, (req, res) => {
	res.render("admin/adminLogin");
});
// to finish the loggin process
router.post("/login", isAdminNotLoggedIn, (req, res) => {
	adminHelper.doLogin(req.body).then((response) => {
		if (response.status) {
			req.session.adminloggedIn = true;
			req.session.admin = response.admin;
			res.redirect("/admin");
		} else {
			res.redirect("/admin/login");
		}
	});
});
// to show all the products
router.get("/allProducts", isAdminLoggedIn, (req, res) => {
	productHelper.getAllProductsAdmin().then((products) => {
		res.render("admin/all-products", { admin: true, products });
	});
});
// to show the product adding page
router.get("/addproduct", isAdminLoggedIn, (req, res) => {
	let admin = req.session.admin;
	catagory_helpers.getAllCatagories().then((catagories) => {
		res.render("admin/add-products", { admin, catagories });
	});
});
// to add the product to the db
router.post(
	"/addproduct",
	isAdminLoggedIn,
	upload.fields([
		{ name: "image1", maxCount: 1 },
		{ name: "image2", maxCount: 1 },
		{ name: "image3", maxCount: 1 },
		{ name: "image4", maxCount: 1 },
	]),
	async (req, res) => {
		const cloudinaryImageUploadMethod = (file) => {
			return new Promise((resolve, reject) => {
				cloudinary.uploader.upload(file, (err, res) => {
					if (err) return res.status(500).send("uploaded image error");
					resolve(res.secure_url);
				});
			});
		};
		const files = req.files;
		let arr1 = Object.values(files);
		let arr2 = arr1.flat();

		const urls = await Promise.all(
			arr2.map(async (file) => {
				const { path } = file;
				const result = await cloudinaryImageUploadMethod(path);
				return result;
			})
		);
		let today = new Date();
		let catagory = await catagory_helpers.getOneCatagory(req.body.catagory);
		if (catagory.catagoryOfferRate == 0) {
			checker = false;
		} else {
			checker = true;
		}
		if (req.body.offerRate < catagory.catagoryOfferRate) {
			let activeOffer = catagory.catagoryOfferRate;
			const body = {
				productName: req.body.productName,
				catagory: req.body.catagory,
				quantity: req.body.quantity,
				offerPrice: parseInt((req.body.price / 100) * (100 - activeOffer)),
				price: req.body.price,
				discription: req.body.discription,
				images: urls,
				date: moment(today).format("YYYY-MM-DD"),
				catagory: req.body.catagory,
				catagoryOffer: catagory.catagoryOfferRate,
				offerRate: req.body.offerRate,
				activeOfferOfProduct: activeOffer,
				isOfferRate: checker,
			};

			productHelper.addProduct(body).then(() => {
				console.log("product added");
				res.redirect("/admin/allProducts");
			});
		} else {
			let activeOffer = 0;
			const body = {
				productName: req.body.productName,
				catagory: req.body.catagory,
				quantity: req.body.quantity,
				offerPrice: parseInt((req.body.price / 100) * (100 - activeOffer)),
				price: req.body.price,
				discription: req.body.discription,
				images: urls,
				date: moment(today).format("YYYY-MM-DD"),
				catagory: req.body.catagory,
				catagoryOffer: catagory.catagoryOffer,
				offerRate: req.body.offerRate,
				activeOfferOfProduct: activeOffer,
				isOfferRate: checker,
			};

			productHelper.addProduct(body).then(() => {
				console.log("product added");
				res.redirect("/admin/allProducts");
			});
		}
	}
);
// to delete the product from the db
router.get("/deleteProduct/:id", isAdminLoggedIn, (req, res) => {
	let productId = req.params.id;
	productHelper.deleteProduct(productId).then(() => {
		res.redirect("/admin/allProducts");
	});
});
// to show the edditing page to the user
router.get("/editProduct/:id", isAdminLoggedIn, async (req, res) => {
	let productId = req.params.id;
	let product = await productHelper.getProductDetails(productId);
	catagory_helpers.getAllCatagories().then((catagories) => {
		res.render("admin/edit-product", { product, catagories });
	});
});
// to make the changes to the db
router.post(
	"/editProduct/:id",
	isAdminLoggedIn,
	upload.fields([
		{ name: "image1", maxCount: 1 },
		{ name: "image2", maxCount: 1 },
		{ name: "image3", maxCount: 1 },
		{ name: "image4", maxCount: 1 },
	]),
	async (req, res) => {
		let productId = req.params.id;
		if (req.files.image1) {
			const cloudinaryImageUploadMethod = (file) => {
				return new Promise((resolve, reject) => {
					cloudinary.uploader.upload(file, (err, res) => {
						if (err) return res.status(500).send("uploaded image error");
						resolve(res.secure_url);
					});
				});
			};
			const files = req.files;
			let arr1 = Object.values(files);
			let arr2 = arr1.flat();

			const urls = await Promise.all(
				arr2.map(async (file) => {
					const { path } = file;
					const result = await cloudinaryImageUploadMethod(path);
					return result;
				})
			);

			const data = {
				productName: req.body.productName,
				catagory: ObjectId(req.body.catagory),
				price: req.body.price,
				offerRate: req.body.offerRate,
				discription: req.body.discription,
				quantity: req.body.quantity,
				images: urls,
			};
			productHelper.updateProduct(data, productId);
		} else {
			const data = {
				productName: req.body.productName,
				catagory: ObjectId(req.body.catagory),
				price: req.body.price,
				offerRate: req.body.offerRate,
				discription: req.body.discription,
				quantity: req.body.quantity,
			};
			productHelper.updateProduct(data, productId);
		}
		await adminHelper.calculateProduct(productId);
		res.redirect("/admin/allProducts");
	}
);
// blocks an existing user
router.get("/blockUser/:id", isAdminLoggedIn, (req, res) => {
	adminHelper.blockUser(req.params.id).then(() => {
		res.redirect("/admin/allUsers");
	});
});
router.get("/unblockUser/:id", isAdminLoggedIn, (req, res) => {
	adminHelper.unblockUser(req.params.id).then(() => {
		res.redirect("/admin/allUsers");
	});
});
// to end the admin session
router.get("/logout", isAdminLoggedIn, (req, res) => {
	req.session.adminloggedIn = false;
	req.session.admin = null;
	res.redirect("/admin/login");
});
// to fetch all users
router.get("/allUsers", isAdminLoggedIn, (req, res) => {
	adminHelper.getAllUsers().then((users) => {
		res.render("admin/all-users", { admin: true, users });
	});
});
router.get("/manageCatagory", isAdminLoggedIn, (req, res) => {
	catagory_helpers.getAllCatagories().then((catagories) => {
		res.render("admin/allCatagories", { admin: true, catagories });
	});
});
router.get("/addCatagory", isAdminLoggedIn, (req, res) => {
	let admin = req.session.admin;
	res.render("admin/addCatagory", { admin });
});
router.post("/addCatagory", async (req, res) => {
	catagory_helpers.checkCatagory(req.body).then((data) => {
		if (data) {
			console.log("catagory fail");
			res.send("catagory already exist");
		} else {
			console.log("added");
			catagory_helpers.addCatagory(req.body);
			res.redirect("/admin/manageCatagory");
		}
	});
});
router.get("/deleteCatagory/:id", isAdminLoggedIn, async (req, res) => {
	let prodId = req.params.id;
	let check = await catagory_helpers.checkForProduct(prodId);

	if (check[0]) {
		res.redirect("/admin/manageCatagory");
	} else {
		catagory_helpers.deleteCatagory(prodId).then(() => {
			res.redirect("/admin/manageCatagory");
		});
	}
});
router.get("/editCatagory/:id", async (req, res) => {
	let user = await catagory_helpers.getOneCatagory(req.params.id);

	res.render("admin/editCatagory", { user });
});
router.post("/editCatagory/:id", (req, res) => {
	catagory_helpers.updateCatagory(req.params.id, req.body).then(() => {
		res.redirect("/admin/manageCatagory");
	});
});
router.get("/viewOrderDetails/:id", isAdminLoggedIn, async (req, res) => {
	let admin = req.session.admin;
	let orderId = req.params.id;
	let address = await userHelper.getSingleOrder(orderId);
	let orderDetails = await userHelper.getOrderProducts(orderId);

	res.render("admin/order-details", { orderDetails, admin, address });
});
router.get("/ship/:id", (req, res) => {
	let orderId = req.params.id;
	adminHelper.shipOrder(orderId).then(() => {
		res.redirect("/admin");
	});
});
router.get("/delever/:id", (req, res) => {
	let orderId = req.params.id;
	adminHelper.deliverOrder(orderId).then(() => {
		res.redirect("/admin");
	});
});
router.get("/cancelOrder/:id", (req, res) => {
	let orderId = req.params.id;
	adminHelper.cancelOrder(orderId);
	res.redirect("/user/allOrders");
});
router.get("/dashBoard", isAdminLoggedIn, async (req, res) => {
	// if(req.query.time){
	// 	let time = req.query.time
	// }else{
	// 	let time =
	// }

	let data = await adminHelper.dashboard();
	console.log(data)

	res.render("admin/dash-board", { data, admin: true });
});
router.get("/report", isAdminLoggedIn, async (req, res) => {
	let today = new Date();
	let end = moment(today).format("YYYY-MM-DD");
	let start = moment(end).subtract(1, "year").format("YYYY-MM-DD");

	let data = await adminHelper.salesReport(start, end);

	res.render("admin/report", { data, admin: true });
});
router.post("/filterReport", async (req, res) => {
	let start = req.body.start;
	let end = req.body.end;
	let data = await adminHelper.sales(start, end);
	console.log(data);
	res.json({ data });
});

router.get("/cupon", isAdminLoggedIn, async (req, res) => {
	let cupons = await cuponHelper.getAllCupon();
	res.render("admin/cupon", { cupons, admin: true });
});
router.get("/addcupon", isAdminLoggedIn, (req, res) => {
	if (req.query.error) {
		res.render("admin/add-cupon", { error: true, admin: true });
	} else {
		res.render("admin/add-cupon", { admin: true });
	}
});
router.post("/addcupon", (req, res) => {
	// console.log(req.body)
	cuponHelper.addCupon(req.body).then((responce) => {
		if (!responce) {
			res.redirect("/admin/addcupon?error=1");
		} else {
			res.redirect("/admin/cupon");
		}
	});
});
router.get("/editCupon", isAdminLoggedIn, async (req, res) => {
	let cuponId = req.query.cuponId;
	let cupon = await cuponHelper.getCuponDetails(cuponId);

	if (req.query.error) {
		res.render("admin/editCupon", { cupon, error: true, admin: true });
	} else {
		res.render("admin/editCupon", { cupon, admin: true });
	}
});
router.post("/editCupon", (req, res) => {
	cuponHelper.editCupon(req.body);
	res.redirect("/admin/cupon");
});
router.get("/deleteCupon", isAdminLoggedIn, (req, res) => {
	let cupon = req.query.cuponId;
	cuponHelper.deleteCupon(cupon);
	res.redirect("/admin/cupon");
});
router.get("/offers", isAdminLoggedIn, async (req, res) => {
	let products = await adminHelper.getValidProducts();
	let catagory = await catagory_helpers.getValidCatagories();
	res.render("admin/offer-page", { products, catagory, admin: true });
});
router.get("/addProductOffer", async (req, res) => {
	let products = await productHelper.getAllProductsAdmin();

	res.render("admin/addProductOffer", { products });
});
router.post("/addProductOffer", async (req, res) => {
	await cuponHelper.addProductOffer(req.body);
	await adminHelper.calculateProduct(req.body.prodId);

	res.redirect("/admin/offers");
});
router.get("/addCatagoryOffer", async (req, res) => {
	let catagories = await catagory_helpers.getAllCatagories();
	res.render("admin/addCatagoryOffer", { catagories });
});
router.post("/addCatagoryOffer", async (req, res) => {
	if (req.body.prodId != 0) {
		catagory_helpers.addCatagoryOffer(req.body);
		let products = await productHelper.getAllProductsAdmin();
		let len = products.length;
		console.log(len);
		for (let i = 0; i < len; i++) {
			await adminHelper.calculateProduct(products[i]._id);
		}

		res.redirect("/admin/offers");
	} else {
		res.redirect("/admin//addCatagoryOffer");
	}
});
router.get("/deleteProductOffer", async (req, res) => {
	let id = req.query.id;
	let data = {
		prodId: id,
		offerRate: 0,
	};

	await cuponHelper.addProductOffer(data);
	await adminHelper.calculateProduct(data.prodId);

	res.redirect("/admin/offers");
});
router.get("/deleteCatagoryOffer", async (req, res) => {
	let id = req.query.id;
	let data = {
		prodId: id,
		offerRate: 0,
	};
	catagory_helpers.addCatagoryOffer(data);
	let products = await productHelper.getAllProductsAdmin();
	let len = products.length;
	console.log(len);
	for (let i = 0; i < len; i++) {
		await adminHelper.calculateProduct(products[i]._id);
	}

	res.redirect("/admin/offers");
});

// to check if the admin is logged in
function isAdminLoggedIn(req, res, next) {
	if (req.session.adminloggedIn) {
		next();
	} else {
		res.redirect("/admin/login");
	}
}
// to check if the admin is not logged in
function isAdminNotLoggedIn(req, res, next) {
	if (req.session.adminloggedIn) {
		res.redirect("/admin");
	} else {
		next();
	}
}

module.exports = router;
