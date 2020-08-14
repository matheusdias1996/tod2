var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var Email = require('email-templates');

var options = {
  auth: {
    api_user: process.env.EMAIL_USER,
    api_key: process.env.EMAIL_PASS
  }
};

var client = nodemailer.createTransport(sgTransport(options));

var email = new Email({
  message: {
    from: 'cursos-no-reply@bain.com'
  },
  // uncomment below to send emails in development/test env:
  send: true,
  transport: client
});

module.exports = function(to, template, locals) {
  email
    .send({
      template: template,
      message: {
        to: to
      },
      locals: locals
    })
    .then(console.log)
    .catch(console.error);
}
