const ExpressError=require('./utils/ExpressError');
const {campgroundSchema,reviewSchema}=require('./schemas.js');
const Campground=require('./models/campground');
const Review=require('./models/review');


module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.returnTo=req.originalUrl;
        req.flash('error','You must be signed in first');
        return res.redirect('/login');
    }
    next();
}



module.exports.validateCampgroud= (req,res,next)=>{
    //joi schema defined in schemas.js file as campgroundSchema for validation purpose
      const {error}=campgroundSchema.validate(req.body);
      if(error){
          const msg=error.details.map(el=>el.message).join(','); //mapping over error which is an array of objects and then extracting message from each element then joining in a single string with ',' comma if these are more than one error message 
          throw new ExpressError(msg,400);
      }
      else{
          next();   // if validation successful we proceed to further 
      }
} 

module.exports.isAuthor=async(req,res,next)=>{
    const {id}=req.params;
    const campground=await Campground.findById(id);
    if(!campground.author.equals(req.user._id)){
        req.flash('error','You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}


//setting middleware for validation

module.exports.validateReview=(req,res,next)=>{
    const {error}=reviewSchema.validate(req.body);
    if(error){
        const msg=error.details.map(el=>el.message).join(',');
        throw new ExpressError(msg,400);
      }
      else{
          next();   // if validation successful we proceed to further 
      }

}

module.exports.isReviewAuthor=async(req,res,next)=>{
    const {id,reviewId}=req.params;
    const review=await Review.findById(reviewId);
    console.log("here",review);
    if(!review.author.equals(req.user._id)){
        req.flash('error','You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}