var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const hbs = require("express-handlebars");

var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
var userRouter = require('./routes/user');
var db = require("./config/connection");
var app = express();
var sessions = require("express-session");

app.use((req,res,next)=>{
  res.set('Cache-Control','no-cache, private,no-store,must-revalidate,max-stale=0,pre-check=0')
  next()
})
app.use(
  sessions({
    secret: "My secret key to use",
    resave: false,
    saveUninitialized: false,
  })
);
app.use((req,res,next)=>{
  res.set('Cache-Control','no-cache, private,no-store,must-revalidate,max-stale=0,pre-check=0')
  next()
})
// view engine setup
app.engine(
  "hbs",
  hbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialsDir: __dirname + "/views/partials/",
  })
);
var Handlebars = require('handlebars');
const { CLIENT_RENEG_LIMIT } = require('tls');

Handlebars.registerHelper("inc", function(value, options)
{
    return parseInt(value) + 1;
});
Handlebars.registerHelper("add",function(arg1,arg2,options){
  return arg1*arg2
})

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(fileUpload());
app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);



db.connect((err) => {
  if (err) {
    console.log("connection error..! " + err);
  } else {
    console.log("database connected..");
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
console.log(err)
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

