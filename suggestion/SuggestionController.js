var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

var VerifyRole = require(__root + 'auth/VerifyRole');
var VerifyToken = require(__root + 'auth/VerifyToken');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var Suggestion = require('./Suggestion');

function handleError(err, res, status, msg) {
  console.error(err);
  res.status(status).send({ err: { msg: msg } });
}

// CREATES A NEW SUGGESTION
router.post('/', VerifyToken, function (req, res) {
    Suggestion.create({
            description: req.body.description,
            name: req.body.name,
        },
        function (err, suggestion) {
            if (err) return handleError(err, res, 500, "There was a problem adding the information to the database.");
            res.status(200).send({ success: { msg: "Suggestion: "+ suggestion.name +" was created." } });
        });
});

// RETURNS ALL THE SUGGESTIONS IN THE DATABASE
router.get('/', VerifyToken, function (req, res) {
    Suggestion.find({}, function (err, suggestions) {
        if (err) return handleError(err, res, 500, "There was a problem finding the suggestions.");
        res.status(200).send(suggestions);
    });
});

// DELETES A SUGGESTION FROM THE DATABASE
router.delete('/:id', VerifyRole('admin'), function (req, res) {
    Suggestion.findByIdAndRemove(req.params.id, function (err, suggestion) {
        if (err) return handleError(err, res, 500, "There was a problem deleting the suggestion.");
        res.status(200).send({ success: { msg: "Suggestion: "+ suggestion.name +" was deleted." } });
    });
});

// UPDATES A SINGLE SUGGESTION IN THE DATABASE
router.put('/support/:id', VerifyToken, function (req, res) {
    Suggestion.findById(req.params.id, function(err, suggestion) {
        if (err) return handleError(err, res, 500, "There was a problem finding the suggestion.");
        if (!suggestion) return handleError(err, res, 404, "No suggestion found.");
        if (suggestion.supporters.map(function(el) {
                return el.toString()
            }).includes(req.userId))
        {
            return handleError(err, res, 400, "Already supporting suggestion.");
        }
        Suggestion.findByIdAndUpdate(req.params.id, {
            $addToSet: { supporters: req.userId }
        }, {new: true}, function (err, suggestion) {
            if (err) return handleError(err, res, 500, "There was a problem updating the suggestion.");
            res.status(200).send({ success: { msg: "Suggestion: you\'re supporting "+ suggestion.name +". Thanks!" } });
        });
    });
});

module.exports = router;
