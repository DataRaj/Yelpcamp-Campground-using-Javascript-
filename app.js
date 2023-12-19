if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
require('dotenv').config();

const express=require('express');
const path=require('path');
const mongoose=require('mongoose');
const ejsMate=require('ejs-mate');
const Joi=require('joi'); 
const ExpressError=require('./utils/ExpressError');
const methodOverride=require('method-override');
const { required, string } = require('joi');
const session=require('express-session');
const flash=require('connect-flash');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const User=require('./models/user');
const helmet=require('helmet');  
const mongoSanitize = require('express-mongo-sanitize');
const userRoutes=require('./routes/users');
const campgroundRoutes=require('./routes/campgrounds');
const reviewRoutes=require('./routes/reviews');

const MongoDBStore = require("connect-mongo")(session); 

const dbUrl=process.env.MONGO_ATLAS_URI || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dbUrl,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', ()=>{
  console.log("Database Connected!");
});

const app=express();

app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true})); 
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname,'public'))); 
app.use(mongoSanitize({
  replaceWith: '_'
}))

const secret=process.env.SECRET || 'thisshouldbeabettersecret!';

const store=new MongoDBStore({     
    url: dbUrl,
    secret,
    touchAfter: 24*60*60  
});

store.on('error',function(e){
    console.log("SESSION STORE ERROR",e);
});

const sessionConfig={
    store,
    name:'session',  
    secret,
    resave: false,
    saveUninitialized: true,
    cookie:{
        httpOnly: true,
        express: Date.now() + 1000*60*60*24*7,  
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet()); 
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://kit.fontawesome.com/",
    "https://fonts.google.com/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com//", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
                "https://www.pexels.com/",
                "https://fontawesome.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);






app.use(passport.initialize());
app.use(passport.session()); // session should be used before passport.session , we are using this sinc we dont want user to login on every request it will remember 
passport.use(new LocalStrategy(User.authenticate())); //we kind of asking passport to use localStrategy that we have downloded in require and for that LocalStrategy the authentication method is going to be located on our user model and its called authenticate (which is a static method comming from the passport local mongoose) 

passport.serializeUser(User.serializeUser()); //this is telling passport how to serialize a user which is basically how do we store user in the session
passport.deserializeUser(User.deserializeUser()); //how to get user out of session


app.use((req,res,next)=>{
    //console.log(req.session);
    res.locals.currentUser=req.user;
    res.locals.success=req.flash('success'); //setting up this middleware before any routes , setting res.locals.session to whatever is there in flash success so that we have access to it everywhere
    res.locals.error=req.flash('error');
    next();
})

app.use('/',userRoutes);
app.use('/campgrounds',campgroundRoutes);  //inside campgrounds routes all routes starting from /campgrounds.
app.use('/campgrounds/:id/reviews',reviewRoutes); //inside reviews routes all routes starting from /campgrounds/:id/reviews



app.get('/',(req,res)=>{
    res.render("home");
})
app.get('/about',(req,res)=>{
    res.render('about');
})

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404));
})

app.use((err,req,res,next)=>{
    const {statusCode=500,message='Something went wrong'}=err;
    if(!err.message) err.message='Something Went Wrong';
    res.status(statusCode).render('error',{err});
})

const port=process.env.PORT ||3000 ; //process.env.PORT will be automatically present on heroku
app.listen(port,()=>{
    console.log(`SERVING ON PORT ${port}!`);
})