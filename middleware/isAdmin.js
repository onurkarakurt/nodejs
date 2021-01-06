module.exports = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }

    if (!req.user.isAdmin) {
        return res.redirect('/');
    }

    next();
    /**
     * admin ve normal user için isAdmin özelliğini navbar a ekledik ancak user gidip ilgili route u yazarsa
     * istediği yere erişebiliyor sadece pug dosyasında işlem yaparsan bunu engellemek için route protection
     * uyguladık yani bu middleware i oluşturup isAdmin değilse diyelim route u yazdı ama (!req.user.isAdmin)
     * isadmin değil anasayfaya yönlendirdik
     * 
     * 
     * Bunları denemek için db de userlara isAdmin özellikleri ekledik
     */
}

