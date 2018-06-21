// middleware for doing role-based permissions
exports.permit = function(...allowed) {
  const isAllowed = roles => {
  	// make sure user has at least one role in common with allowed
  	return allowed.some(el => roles.indexOf(el) > -1);
  }
  
  // return a middleware
  return (req, res, next) => {
    if (req.user && isAllowed(req.user.roles))
      next(); // role is allowed, so continue on the next middleware
    else {
      res.status(403).render('error', {message: "You do not have permission to perform that action!"}); // user is forbidden
    }
  }
}