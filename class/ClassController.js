var crypto = require('crypto');
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var ObjectId = require('mongoose').Types.ObjectId;

var VerifyRole = require(__root + 'auth/VerifyRole');
var VerifyToken = require(__root + 'auth/VerifyToken');

var sendIcalMail = require('../email/sendIcalMail');
var sendMail = require('../email/sendMail');
var agenda = require('../agenda')

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var Class = require('./Class');
var Subject = require('../subject/Subject');
var Token = require('../token/Token');
var User = require('../user/User');

function handleError(err, res, status, msg) {
  console.error(err);
  res.status(status).send({ err: { msg: msg } });
}

function formatNumber(n) {
    return ('0' + n).slice(-2);
}

function formatDate(date) {
    return formatNumber(date.getDate()) + '/' +
        formatNumber(date.getMonth() + 1) + '/' +
        date.getFullYear() + ' - ' +
        formatNumber(date.getHours()) + ':' +
        formatNumber(date.getMinutes())
}

function finishDate(date, duration) {
    return new Date(date.getTime() + (1000 * 60 * 60 * duration))
}

function oneWeekBefore(date) {
    return new Date(date.getTime() - (1000 * 60 * 60 * 24 * 7))
}

function createToken(res, user, callback) {
  Token.create({
    _userId: user._id,
    token: crypto.randomBytes(16).toString('hex')
  }, function(err, token) {
    if (err) {
      console.error(err);
      return res.status(500).send({ err: { msg: "There was a problem creating the token." } });
    }

    callback(token.token);
  });
}

function formatDateInvite(date) {
    var months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];

    //setting message adjusted to BR GMT
    var offsetBrasil = date.getTime() + date.getTimezoneOffset()*60000 - 3*3600000;
    fixedDate = new Date(offsetBrasil);

    return months[fixedDate.getMonth()] + ' ' + formatNumber(fixedDate.getDate()) + ', ' + formatNumber(fixedDate.getHours()) + ':' + formatNumber(fixedDate.getMinutes())
}

// CREATES A NEW CLASS
router.post('/', VerifyRole('admin'), function (req, res) {
    if (!req.body.date || !req.body.duration || req.body.students.length === 0 || req.body.teachers.length === 0) {
        return handleError(null, res, 400, "A date, a duration and at least one student and one teacher must be selected.");
    }
    if (new Date(req.body.date) <= new Date()) {
        return handleError(null, res, 400, "You can't schedule a class in the past.");
    }
    if (req.body.duration < 0.5 || req.body.duration > 4) {
        return handleError(null, res, 400, "A class must have a duration between 0.5 and 4 hours.");
    }

    Class.create({
            date: new Date(req.body.date), // '2011-04-11T10:20:30Z'
            room: req.body.room,
            duration: req.body.duration,
            students: req.body.students,
            subject: req.body.subjectId,
            teachers: req.body.teachers,
            sequence: 0
        },
        function (err, clazz) {
            if (err) return handleError(err, res, 500, "There was a problem adding the information to the database.");

            Subject.findById(req.body.subjectId, function(err, subject) {
                if (err) return handleError(err, res, 500, "There was a problem finding the subject.");

                User.find({ _id: {
                    $in: req.body.students.concat(req.body.teachers)
                } }, function(err, users) {
                    if (err) return handleError(err, res, 500, "There was a problem finding the users.");

                    var containsRequestUser = users.find(function(user) {
                        return user._id.toString() === req.userId.toString();
                    });

                    !containsRequestUser && users.push(req.user);

                    var usersSet = new Set(users);

                    usersSet.forEach(function(user) {
                        var dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                        var timeOptions = { hour: '2-digit', minute: '2-digit' };

                        agenda.define('send-invite' + user._id, function(job, done) {
                            var teacher = users.find(function(user) {
                                return user._id.toString() === clazz.teachers[0].toString();
                            });
                            sendIcalMail(user.email, 'invite', {
                                descriptionData: {
                                    clazz: {
                                        datetime: formatDateInvite(clazz.date),
                                        teacher: teacher ? teacher.name : 'Undentified',
                                    },
                                    subject: {
                                        description: subject.description,
                                        name: subject.name,
                                    }
                                },
                                end: finishDate(clazz.date, clazz.duration),
                                location: clazz.room,
                                method: 'request',
                                organizer: {
                                    email: req.user.email,
                                    name: req.user.name
                                },
                                start: clazz.date,
                                summary: 'Invite to ' + subject.name,
                                uid: clazz._id.toString(),
                                sequence: clazz.sequence,
                            });
                            done();
                        });
                        agenda.now('send-invite' + user._id);

                        // comment if clause below to send confirmation now:
                        if (oneWeekBefore(clazz.date) > new Date()) {
                            createToken(res, user, function(token) {
                                agenda.define('send-class-confirmation' + user._id, function(job, done) {
                                    sendMail(user.email, 'class-confirmation', {
                                        classId: clazz._id,
                                        clazz: {
                                            date: clazz.date.toLocaleString('en-US', dateOptions),
                                            time: clazz.date.toLocaleString('en-US', timeOptions)
                                        },
                                        room: clazz.room,
                                        subject: {
                                            name: subject.name
                                        },
                                        token: token,
                                        user: {
                                            name: user.name
                                        }
                                    });
                                    done();
                                });
                                // uncomment below to send confirmation now:
                                // agenda.now('send-class-confirmation' + user._id);
                                agenda.schedule(oneWeekBefore(clazz.date), 'send-class-confirmation' + user._id);
                            });
                        }
                    });

                    res.status(200).send({ success: { msg: "Class: at "+ formatDate(clazz.date) +" was created." } });
                });
            });
        });
});

// RETURNS ALL THE CLASSS IN THE DATABASE
router.get('/', VerifyToken, function (req, res) {
    Class.find({ closed: false }, function (err, clazzes) {
        if (err) return handleError(err, res, 500, "There was a problem finding the classes.");
        res.status(200).send(clazzes);
    });
});

// RETURNS ALL THE CLASSS IN THE DATABASE FOR A DEFINED SUBJECT
router.get('/bySubject/:subjectId', VerifyToken, function (req, res) {
    Class.find({ subject: req.params.subjectId, closed: false })
        .populate('students', '-password')
        .populate('teachers', '-password')
        .exec(function (err, clazzes) {
            if (err) return handleError(err, res, 500, "There was a problem finding the classes.");
            res.status(200).send(clazzes);
        });
});

// GETS A SINGLE CLASS FROM THE DATABASE
router.get('/:id', VerifyToken, function (req, res) {
    Class.find({ _id: req.params.id, closed: false })
        .populate('students', '-password')
        .populate('teachers', '-password')
        .exec(function (err, clazz) {
            if (err) return handleError(err, res, 500, "There was a problem finding the class.");
            if (!clazz) return handleError(err, res, 404, "No class found.");
            res.status(200).send(clazz);
        });
});

// DELETES A CLASS FROM THE DATABASE
router.delete('/:id', VerifyRole('admin'), function (req, res) {
    Class.findByIdAndRemove(req.params.id, function (err, clazz) {
        if (err) return handleError(err, res, 500, "There was a problem deleting the class.");
        res.status(200).send({ success: { msg: "Class: "+ clazz._id +" was deleted." } });
    });
});

// DELETES A CLASS FROM THE DATABASE FOR A DEFINED SUBJECT AND DATE
router.delete('/bySubjectAndDate/:subjectId/:date', VerifyRole('admin'), function (req, res) {
    Class.findOneAndDelete({ subject: req.params.subjectId, date: new Date(req.params.date) }, function (err, clazz) {
        if (err) return handleError(err, res, 500, "There was a problem deleting the classes.");
        Subject.findById(req.params.subjectId, function(err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem finding the subject.");

            User.find({ _id: {
                $in: clazz.students.concat(clazz.teachers)
            } }, function(err, users) {
                if (err) return handleError(err, res, 500, "There was a problem finding the users.");

                var containsRequestUser = users.find(function(user) {
                    return user._id.toString() === req.userId.toString();
                });

                !containsRequestUser && users.push(req.user);

                var usersSet = new Set(users);

                usersSet.forEach(function(user) {
                    var dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    var timeOptions = { hour: '2-digit', minute: '2-digit' };

                    agenda.define('cancel-invite' + user._id, function(job, done) {
                        sendIcalMail(user.email, 'cancelInvite', {
                            descriptionData: {
                                clazz: {
                                    datetime: formatDateInvite(clazz.date),
                                },
                                subject: {
                                    name: subject.name,
                                }
                            },
                            location: clazz.room,
                            method: 'cancel',
                            organizer: {
                                email: req.user.email,
                                name: req.user.name
                            },
                            start: clazz.date,
                            summary: subject.name + ' training cancelled',
                            uid: clazz._id.toString(),
                            sequence: clazz.sequence + 1,
                        });
                        done();
                    });
                    agenda.now('cancel-invite' + user._id);
                    agenda.on('fail:cancel-invite' + user._id, function(err, job) {
                        console.log(`Job failed with error: ${err.message}`);
                        console.log(err)
                    });
                });
            });
        });
        res.status(200).send({ success: { msg: "Class: at " + formatDate(new Date(req.params.date)) + " was deleted." } });
    });
});

// UPDATES A SINGLE CLASS IN THE DATABASE
router.put('/:id', VerifyRole('admin'), function (req, res) {
    Class.findByIdAndUpdate(req.params.id, req.body, {new: true}, function (err, clazz) {
        if (err) return handleError(err, res, 500, "There was a problem updating the class.");
        res.status(200).send({ success: { msg: "Class: at " + formatDate(new Date(req.params.date)) + " was updated." } });
    });
});

// UPDATES A CLASS FROM THE DATABASE FOR A DEFINED SUBJECT AND DATE
router.put('/bySubjectAndDate/:subjectId/:date', VerifyRole('admin'), function (req, res) {
    if (!req.body.date || req.body.students.length === 0 || req.body.teachers.length === 0) {
        return handleError(null, res, 400, "A date and at least one student and one teacher must be selected.");
    }
    if (new Date(req.body.date) <= new Date()) {
        return handleError(null, res, 400, "You can't schedule a class in the past.");
    }

    Class.findOneAndUpdate({ subject: req.params.subjectId, date: new Date(req.params.date)}, { $set : req.body, $inc : {"sequence": 1} }, {new: true}, function (err, clazz) {
        if (err) return handleError(err, res, 500, "There was a problem updating the class.");
        Subject.findById(req.params.subjectId, function(err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem finding the subject.");

            User.find({ _id: {
                $in: clazz.students.concat(clazz.teachers)
            } }, function(err, users) {
                if (err) return handleError(err, res, 500, "There was a problem finding the users.");

                var containsRequestUser = users.find(function(user) {
                    return user._id.toString() === req.userId.toString();
                });

                !containsRequestUser && users.push(req.user);

                var usersSet = new Set(users);

                usersSet.forEach(function(user) {
                    var dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    var timeOptions = { hour: '2-digit', minute: '2-digit' };

                    agenda.define('update-invite' + user._id, function(job, done) {
                        sendIcalMail(user.email, 'updateInvite', {
                            descriptionData: {
                                clazz: {
                                    datetime: formatDateInvite(clazz.date),
                                },
                                subject: {
                                    name: subject.name,
                                }
                            },
                            location: clazz.room,
                            method: 'request',
                            organizer: {
                                email: req.user.email,
                                name: req.user.name
                            },
                            start: clazz.date,
                            end: finishDate(clazz.date, clazz.duration),
                            summary: subject.name + ' training updated',
                            uid: clazz._id.toString(),
                            sequence: clazz.sequence,
                        });
                        done();
                    });
                    agenda.now('update-invite' + user._id);
                    agenda.on('fail:update-invite' + user._id, function(err, job) {
                        console.log(`Job failed with error: ${err.message}`);
                        console.log(err)
                    });
                });
            });
        });
        res.status(200).send({ success: { msg: "Class: at " + formatDate(new Date(req.params.date)) + " was updated." } });
    });
});

// CLOSES A CLASS FROM THE DATABASE FOR A DEFINED SUBJECT AND DATE
router.put('/close/bySubjectAndDate/:subjectId/:date', VerifyRole('admin'), function (req, res) {
    if (req.body.npsURL === '') {
        return handleError(null, res, 400, "NPS link must be filled.");
    }

    Class.findOneAndUpdate({ subject: req.params.subjectId, date: new Date(req.params.date), students: req.body.students }, { closed: true }, {new: true}, function (err, clazz) {
        if (err) return handleError(err, res, 500, "There was a problem updating the class.");
        Subject.findById(req.params.subjectId, function(err, subject) {
            if (err) return handleError(err, res, 500, "There was a problem finding the subject.");

            subject.trained = subject.trained.concat(req.body.students.filter(function(student) {
                return !subject.trained.some(function (trained) {
                    return trained.equals(student);
                });
            }));

            subject.students = subject.students.filter(function(student) {
                return !req.body.students.includes(student.toString());
            });

            subject.save(function(err) {
                if (err) return handleError(err, res, 500, "There was a problem updating the subject.");

                User.find({ _id: {
                    $in: req.body.students
                } }, function(err, users) {
                    if (err) return handleError(err, res, 500, "There was a problem finding the users.");
                    users.forEach(function(user) {
                        sendMail(user.email, 'nps', {
                            subject: {
                                name: subject.name
                            },
                            user: {
                                name: user.name
                            },
                            npsURL: req.body.npsURL
                        });
                    });

                    res.status(200).send({ success: { msg: "Class: at " + formatDate(new Date(req.params.date)) + " was closed." } });
                });
            });
        });
    });
});

router.put('/confirm/:class/:token/yes', function (req, res) {
    Token.findOne({ token: req.params.token }, function(err, token) {
        if (err) return handleError(err, res, 500, "There was a problem finding the token.");
        if (!token) {
          return res.status(404).send({ err: { msg: "No token found." } });
        }

        res.status(200).send({ success: { msg: "Your presence was confirmed."}});
    });
});

router.put('/confirm/:class/:token/no', function (req, res) {
    Token.findOne({ token: req.params.token }, function(err, token) {
        if (err) return handleError(err, res, 500, "There was a problem finding the token.");
        if (!token) {
          return res.status(404).send({ err: { msg: "No token found." } });
        }

        Class.findByIdAndUpdate(req.params.class, { $pull: {students: token._userId } }, function(err) {
            if (err) return handleError(err, res, 500, "There was a problem updating the class.");
            res.status(200).send({ success: { msg: "Your participation on the class was removed."}});
        });
    });
});

module.exports = router;
