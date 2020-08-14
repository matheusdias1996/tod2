var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

var VerifyRole = require(__root + 'auth/VerifyRole');
var VerifyToken = require(__root + 'auth/VerifyToken');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var Class = require('../class/Class');
var Subject = require('./Subject');
var User = require('../user/User'); //Adicionei isso aqui

function handleError(err, res, status, msg) {
  console.error(err);
  res.status(status).send({ err: { msg: msg } });
}

// CREATES A NEW SUBJECT
router.post('/', VerifyRole('admin'), function (req, res) {
    Subject.create({
            description: req.body.description,
            name: req.body.name,
        },
        function (err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem adding the information to the database.");
            res.status(200).send({ success: { msg: "Subject: "+ subject.name +" was created." } });
        });
});

// RETURNS ALL THE SUBJECTS IN THE DATABASE
router.get('/', VerifyToken, function (req, res) {
    Subject.find({}, function (err, subjects) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subjects.");
        res.status(200).send(subjects);
    });
});

// RETURNS ALL THE SUBJECTS IN THE DATABASE
router.get('/byUser', VerifyToken, function (req, res) {
    Subject.find({ $or: [ { students: req.userId }, { teachers: req.userId } ] }, function (err, subjects) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subjects.");
        res.status(200).send(subjects);
    });
});

// GETS A SINGLE SUBJECT FROM THE DATABASE
router.get('/:id', VerifyToken, function (req, res) {
    Subject.findById(req.params.id)
        .populate('students', '-password')
        .populate('teachers', '-password')
        .populate('trained', '-password')
        .exec(function (err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem finding the Subject.");
            if (!subject) return handleError(err, res, 404, "No subject found.");
            res.status(200).send(subject);
        });
});

// DELETES A SUBJECT FROM THE DATABASE
router.delete('/:id', VerifyRole('admin'), function (req, res) {
    Subject.findByIdAndRemove(req.params.id, function (err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem deleting the subject.");
        res.status(200).send({ success: { msg: "Subject: "+ subject.name +" was deleted." } });
    });
});

// UPDATES A SINGLE SUBJECT IN THE DATABASE
router.put('/:id', VerifyRole('admin'), function (req, res) {
    if (req.body.name === '' || req.body.description === '') {
        return handleError(null, res, 400, "Name and description must have a value.");
    }

    Subject.findByIdAndUpdate(req.params.id, req.body, {new: true}, function (err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
        Subject.findById(subject.id)
            .populate('students', '-password')
            .populate('teachers', '-password')
            .populate('trained', '-password')
            .exec(function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem finding the Subject.");
                if (!subject) return handleError(err, res, 404, "No subject found.");
                res.status(200).send(subject);
            });
    });
});
// STUDENT SHOWS INTEREST IN SUBJECT
router.put('/showInterest/:id', VerifyToken, function (req, res) { // ID TEMA e email usuário - usar email do usuario para encontrar o ID
    Subject.findById(req.params.id, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");
// Buscar id do usuário no banco de dados, findbyEmail (olhar usercontroller, deve ter algo parecido)
        // if (subject[req.body.type].map(function(el) {
        //         return el.toString()
        //     }).includes(req.userId)) //pegar usuario do id que duda vai mandar
        // {
        //     return handleError(err, res, 400, "Already showed interest.");
        // }

        Subject.findByIdAndUpdate(req.params.id, { // user.name vai vir do usuario do banco de dados
            $addToSet: { [req.body.type]: req.userId } //pegar usuario do id que duda vai mandar
        }, {new: true}, function (err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
            res.status(200).send({ success: { msg: "Subject: you\'ve' shown interest on "+ subject.name +". Thanks!" } }); //
        });
    });
});

// ADMIN ADDS SOMEONE TO THE LIST OF STUDENTS WHO ATTENDED A CERTAIN CLASS
router.put('/addAttended/:id', VerifyToken, function (req, res) { 
    Subject.findById(req.params.id, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");
        //console.log(subject[req.body.type]);
        
        // if (subject[req.body.type].map(function(el){
        //     return el.toString()
        //  }).includes(req.userId)) 
        //  {
        //     return handleError(err, res, 400, user + "Already attended class"); 
        //  }

        User.findOne({email: req.body.email}, function (err, user) { 
            if (err) return res.status(500).send({ err: { msg: "There was a problem finding the user." } });
            if (!user) return res.status(404).send({ err: { msg: "No user found." } });
            //console.log(req.bo);
                //res.status(200).send(user); // o que está fazendo aqui?


            Subject.findByIdAndUpdate(req.params.id, { 
                $addToSet: {[req.body.type]: user._id}
            }, {new: true}, function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
                console.log(user._id);
                res.status(200).send({ success: { msg: "User: " + user.name + " is on the list of students who attended "+ "Subject: "+ subject.name + ". Thanks!" } }); 
            });
        });
    });
});
// ADMIN ADDS SOMEONE TO THE LIST OF STUDENTS WHO DID NOT ATTEND A CERTAIN CLASS
router.put('/addNotAttended/:id', VerifyToken, function (req, res) { 
    Subject.findById(req.params.id, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");

        // if (subject[req.body.type].map(function(el) {
        //     return el.toString()
        // }).includes(user.userId)) 
        // {
        // return handleError(err, res, 400, user + "Did not attend class");
        // }

// Buscar id do usuário no banco de dados, findbyEmail (olhar usercontroller, deve ter algo parecido)
        User.findOne({email: req.body.email},  function (err, user) {
            if (err) return res.status(500).send({ err: { msg: "There was a problem finding the user." } });
            if (!user) return res.status(404).send({ err: { msg: "No user found." } });
            //res.status(200).send(user);


            Subject.findByIdAndUpdate(req.params.id, { 
                $addToSet: { [req.body.type]: user._id } //Como o programa sabe que essa lista é diferente da lista de attended?
            }, {new: true}, function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
                res.status(200).send({ success: { msg: "User:" + user.name + " is on the list of students who did not attend Subject: "+ subject.name + ". Thanks!" } }); 
            });
        });
    });
});
//Add funcionalidade para deletar nomes das duas listas

// ADMIN DELETES SOMEONE FROM THE LIST OF STUDENTS WHO ATTENDED A CERTAIN CLASS
router.put('/deleteAttended/:id', VerifyToken, function (req, res) { 
    Subject.findById(req.params.id, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");

        // if (subject[req.body.type].map(function(el) {
        //     return el.toString()
        // }).includes(user.userId)) 
        // {
        // return handleError(err, res, 400, user + "Already attended class"); // Esse erro vai acontecer 
        // }
        
        User.findOne({email: req.body.email}, function (err, user) { 
            if (err) return res.status(500).send({ err: { msg: "There was a problem finding the user." } });
            if (!user) return res.status(404).send({ err: { msg: "No user found." } });
                //res.status(200).send(user); // o que está fazendo aqui?


            Subject.findByIdAndUpdate(req.params.id, { 
                $pull: { [req.body.type]: user._id } //deletar usuario da base de dados attended aqui
            }, {new: true}, function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
                res.status(200).send({ success: { msg: "User: " + user.name + " is not on the list of students who attended Subject: "+ subject.name + " anymore. Thanks!" } }); 
            });
        });
    });
});
// ADMIN DELETES SOMEONE FROM THE LIST OF STUDENTS WHO DID NOT ATTEND A CERTAIN CLASS

router.put('/deleteNotAttended/:id', VerifyToken, function (req, res) { 
    Subject.find({email: req.params.email}, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");

        User.findOne({email: req.body.email}, function (err, user) { 
            if (err) return res.status(500).send({ err: { msg: "There was a problem finding the user." } });
            if (!user) return res.status(404).send({ err: { msg: "No user found." } });
            //res.status(200).send(user);

            // if (subject[req.body.type].map(function(el) {
            //     return el.toString()
            // }).includes(user.userId)) 
            // {
            //     return handleError(err, res, 400, user + "Did not attend class"); // Esse erro vai acontecer
            // }

            Subject.findByIdAndUpdate(req.params.id, { 
                $pull: { [req.body.type]: user._id } //deletar usuario da base de dados not attended aqui
            }, {new: true}, function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
                res.status(200).send({ success: { msg: "User:" + user.name + " is not on the list of students who did not attend Subject: "+ subject.name + " anymore. Thanks!" } }); 
            });
        });
    });
});
router.put('/removeInterest/:id', VerifyToken, function (req, res) {
    Subject.findById(req.params.id, function(err, subject) {
        if (err) return handleError(err, res, 500, "There was a problem finding the subject.");
        if (!subject) return handleError(err, res, 404, "No subject found.");

        if (!subject[req.body.type].map(function(el) {
                return el.toString()
            }).includes(req.userId))
        {
            return handleError(err, res, 400, "Did not show interest.");
        }

        Class.find({ subject: req.params.id, [req.body.type]: req.userId, date: { $gt: new Date() } }, function(err, classes) {
            if (err) return handleError(err, res, 500, "There was a problem finding classes.");
            if (classes.length !== 0) {
                return handleError(err, res, 400, "Cannot remove interest, you already have a class scheduled.");
            }

            Subject.findByIdAndUpdate(req.params.id, {
                $pull: { [req.body.type]: req.userId }
            }, {new: true, safe: true}, function (err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");
                res.status(200).send({ success: { msg: "Subject: you\'ve' removed interest on "+ subject.name +". Thanks!" } });
            });
        });

    });
});

module.exports = router;
