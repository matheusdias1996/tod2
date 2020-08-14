var bcrypt = require('bcryptjs');
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

var VerifyRole = require(__root + 'auth/VerifyRole');
var VerifyToken = require(__root + 'auth/VerifyToken');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var User = require('./User');

// CREATES A NEW USER
router.post('/', VerifyRole('admin'), function (req, res) {
    User.create({
            name : req.body.name,
            email : req.body.email,
            password : req.body.password
        },
        function (err, user) {
            if (err) return res.status(500).send({ err: { msg: "There was a problem adding the information to the database." } });
            res.status(200).send(user);
        });
});

// RETURNS ALL THE USERS IN THE DATABASE
router.get('/', VerifyRole('admin'), function (req, res) {
    User.find({}, function (err, users) {
        if (err) return res.status(500).send({ err: { msg: "There was a problem finding the users." } });
        res.status(200).send(users);
    });
});

// GETS A SINGLE USER FROM THE DATABASE
router.get('/:id', VerifyRole('admin'), function (req, res) {
    User.findById(req.params.id, function (err, user) {
        if (err) return res.status(500).send({ err: { msg: "There was a problem finding the user." } });
        if (!user) return res.status(404).send({ err: { msg: "No user found." } });
        res.status(200).send(user);
    });
});

// DELETES A USER FROM THE DATABASE
router.delete('/:id', VerifyRole('admin'), function (req, res) {
    User.findByIdAndRemove(req.params.id, function (err, user) {
        if (err) return res.status(500).send({ err: { msg: "There was a problem deleting the user." } });
        res.status(200).send({ success: { msg: "User: "+ user.name +" was deleted." } });
    });
});

// UPDATES A SINGLE USER IN THE DATABASE
router.put('/:id', VerifyToken, function (req, res) {
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).send({ err: { msg: "Password and confirm password must be equal." } });
    }

    if (req.body.name === '') {
        return res.status(400).send({ err: { msg: "Name must have a value." } });
    }

    if (req.userId !== req.params.id) {
        return res.status(403).send({ err: { msg: 'User not allowed.' } });
    }

    // guarantees that email is never updated
    req.body.email = undefined;

    function updateUser() {
        User.findByIdAndUpdate(req.params.id, req.body, {new: true}, function (err, user) {
            if (err) return res.status(500).send({ err: { msg: "There was a problem updating the user." } });
            res.status(200).send({ success: { msg: 'Profile updated!' } })
        });
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 10, function(err, hashedPassword) {
            req.body.password = hashedPassword;
            updateUser();
        });
    } else {
        updateUser();
    }
});

module.exports = router;
