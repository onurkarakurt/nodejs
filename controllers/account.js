const User = require('../models/user');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto'); //node-js içerisinde build-in bir paket. Pasword resetlemede kullanacaz.

sgMail.setApiKey('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');

exports.getLogin = (req, res, next) => {
    var errorMessage = req.session.errorMessage;
    delete req.session.errorMessage;
    res.render('account/login', {
        path: '/login',
        title: 'Login',
        errorMessage: errorMessage
    });
}

exports.postLogin = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                req.session.errorMessage = 'Bu mail adresi ile bir kayıt bulunamamıştır.';
                req.session.save(function (err) {
                    console.log(err);
                    return res.redirect('/login');
                });
            }

            bcrypt.compare(password, user.password)
                .then(isSuccess => {
                    if (isSuccess) {
                        req.session.user = user;
                        req.session.isAuthenticated = true;
                        return req.session.save(function (err) {
                            var url = req.session.redirectTo || '/';
                            delete req.session.redirectTo;
                            return res.redirect(url);

                        });
                    }
                    res.redirect('/login');
                })
                .catch(err => {
                    console.log(err);
                })
        })
        .catch(err => console.log(err));
}

exports.getRegister = (req, res, next) => {
    var errorMessage = req.session.errorMessage;
    delete req.session.errorMessage;
    res.render('account/register', {
        path: '/register',
        title: 'Register',
        errorMessage: errorMessage
    });
}

exports.postRegister = (req, res, next) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email: email })
        .then(user => {
            if (user) {
                req.session.errorMessage = 'Bu mail adresi ile daha önceden kayıt olunmuştur.';
                req.session.save(function (err) {
                    console.log(err);
                    return res.redirect('/register');
                });
            }

            return bcrypt.hash(password, 10);
        })
        .then(hashedPassword => {
            console.log(hashedPassword);

            const newUser = new User({
                name: name,
                email: email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return newUser.save();
        })
        .then(() => {
            res.redirect('/login');
            const msg = {
                to: email,
                from: 'onurkarakurt93@gmail.com',
                subject: 'Hesap oluşturuldu',
                text: 'and easy to do anywhere, even with Node.js',
                html: '<strong>Hesabınız başarılı bir şekilde oluşturuldu</strong>',
            };
            sgMail.send(msg);
        }).catch(err => {
            console.log(err);
        })
}

exports.getReset = (req, res, next) => {
    var errorMessage = req.session.errorMessage;
    delete req.session.errorMessage;
    res.render('account/reset', {
        path: '/reset-password',
        title: 'Reset Password',
        errorMessage: errorMessage
    });
}

exports.postReset = (req, res, next) => {
    const email = req.body.email;
    //şifre resetleme yaparken random 32 bitlik bir sayı üretecez hata varsa reset-password de kalacak yoksa oluşan sayı buffer oluyor
    //bunun hexedecimal karşılığını token a atacaz
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset-password');
        }
        const token = buffer.toString('hex');
        console.log(token);
        User.findOne({ email: email })
            .then(user => {
                if (!user) {
                    req.session.errorMessage = 'Mail adresi bulunamadı.';
                    req.session.save(function (err) {
                        console.log(err);
                        return res.redirect('/reset-password');
                    });
                }
                user.resetToken = token; //token bilgisini collectiona yollayalım
                user.resetTokenExpiration = Date.now() + 360000; //bir saat sonra reset olacak şekilde şimdiki zamana 1 saat ekliyoz
                return user.save(); //token bilgisini user tablosuna böylelikle ekleriz
            })
            .then(user => {
                res.redirect('/');
                //kullanıcıya bilgilendirme maili attık ve o mail içinde sıfırlama linki verdik tıklayınca kendisine verdiğimiz token bilgisi 
                //ile sıfırlama sayfasına yönlendiriyoruz.
                const msg = {
                    to: email,
                    from: 'onurkarakurt93@gmail.com',
                    subject: 'Parola sıfırlama',
                    text: 'and easy to do anywhere, even with Node.js',
                    html: `
                        <p>Parolanızı güncellemek için aşağıdaki linke tıklayınız</p>
                        <p>
                            <a href="http://localhost:3000/reset-password/${token}">Reset Password</a>
                        </p>
                    `,
                };
                sgMail.send(msg);
            }).catch(err => { console.log(err) });
    })
}

exports.getNewPassword = (req, res, next) => {
    var errorMessage = req.session.errorMessage;
    delete req.session.errorMessage;
    //route içerisinden tokenı alalım
    const token = req.params.token;
    //ve bu token bilgisi user collection içerisinde var mı bakalım
    User.findOne({
        resetToken: token, resetTokenExpiration: {
            $gt: Date.now() //kullanım süresi dolmamış bir token varsa 
        }
    })
        //bu iki kritere uyan bir user kaydı varsa bunu alalım
        .then(user => {
            res.render('account/new-password', {
                path: '/new-password',
                title: 'New Password',
                errorMessage: errorMessage,
                userId: user._id.toString(),
                passwordToken: token
            })
        })
        .catch(err => {
            console.log(err);
        })
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const token = req.body.passwordToken;
    const userId = req.body.userId;
    let _user;

    User.findOne({
        resetToken: token,
        resetTokenExpiration: {
            $gt: Date.now()
        },
        _id: userId
    })
        .then(user => {
            _user = user;
            return bcrypt.hash(newPassword, 10); //tekrardan yeni parolayı hashledik
        })
        .then(hashedPassword => {
            //userı bir üstteki then de yakaladık burda kullanabilmek için _user tanımlamalıyız ve üstte user ı 
            //ona atamalıyız
            _user.password = hashedPassword;
            _user.resetToken = undefined;//bunu kullandık artık undefined olsun
            _user.resetTokenExpiration = undefined;
            return _user.save(); //db de görsün değişikliği 
        })
        .then(() => {
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
        })
}

exports.getLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    })
}