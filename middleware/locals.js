module.exports = (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAuthenticated = req.session.isAuthenticated;
    /**
     * request içerisinde user bilgisi varsa isAdmini alalım yoksa da isAdmin için false değerini verelim
     * req içerisinde user bilgisi varsa req.user.isAdmini res.locals.isAdmine atayalım yoksa false atayalım
     */
    res.locals.isAdmin = req.user ? req.user.isAdmin : false
    next();
    /**
     * ismi csrf ten locals diye değiştirdik ilgili routelar içerisinde csrf i ctrl alt l ile locals yaptık
     * 
     */
}