var express = require("express");
var router = express.Router();
const productHelper = require("../helpers/product_helpers"); //product collection
const catagory_helpers = require("../helpers/catagory_helpers");
const user_helpers = require("../helpers/user_helpers");
/* GET landing page. */
router.get("/", (req, res, next) => {
	let user = req.session.user;
	let admin = req.session.admin;
	res.render("index", { user });
});
router.get("/allProducts", async (req, res) => {
	let page = parseInt(req.query.page) ;
	if(!page){
		page=0
	}

	let cata = req.query.catg;
	let sort = req.query.sort;
	let user = req.session.user;
	if (cata && sort) {
		let products = await productHelper.filterSortCatagory(cata, sort,page);
		let len = products.length / 8;
		let pages = [];
		for (let i = 0; i < len; i++) {
			pages.push(i);
		}

		catagory_helpers.getAllCatagories().then((catagories) => {
			res.render("all-products", { user, products, catagories,pages });
		});
	} else if (cata) {
		let products = await productHelper.filterCatagory(cata,page);
		let count = await productHelper.countCatagory(cata);
		let len = parseFloat(count / 8) ;
		let pages = [];
		for (let i = 0; i <= len; i++) {
			pages.push(i);
		}

		catagory_helpers.getAllCatagories().then((catagories) => {
			res.render("all-products", { user, products, catagories,pages });
		});
	} else if (sort) {
		let products = await productHelper.sortCatagory(sort,page);
		let count = await productHelper.catagoryCount(sort);
		let len = parseFloat(count / 8);
		let pages = [];
		for (let i = 0; i < len; i++) {
			pages.push(i);
		}

		catagory_helpers.getAllCatagories().then((catagories) => {
			res.render("all-products", { user, products, catagories,pages });
		});
	} else {
		productHelper.getAllProducts(page).then(async(products) => {
			let count = await productHelper.countAllProducts()
			let len = parseFloat(count / 8);
			let pages = [];
			for (let i = 0; i < len; i++) {
				pages.push(i);
			}
	
			catagory_helpers.getAllCatagories().then((catagories) => {
				res.render("all-products", { user, products, catagories,pages });
			});
		});
	}
});

router.get("/item/:id", (req, res) => {
	let user = req.session.user;
	prodId = req.params.id;
	productHelper.getProductDetails(prodId).then(async (data) => {
		let catagory = await catagory_helpers.getOneCatagory(data.catagory);

		res.render("item", { data, catagory, user });
	});
});
module.exports = router;
