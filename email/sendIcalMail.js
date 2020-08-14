var ical = require('ical-generator');
var nodemailer = require('nodemailer');
var pug = require('pug');

var transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

var templates = {
  invite: pug.compileFile(__root + '/emails/invite/html.pug'),
  cancelInvite: pug.compileFile(__root + '/emails/cancel-invite/html.pug'),
  updateInvite: pug.compileFile(__root + '/emails/update-invite/html.pug'),
}

module.exports = function(to, template, calSettings) {
  var cal = ical({
    domain: process.env.CLIENT_HOST,
    events: [
      {
        description: templates[template](calSettings.descriptionData),
        end: calSettings.end,
        location: calSettings.location,
        organizer: calSettings.organizer,
        start: calSettings.start,
        status: template === 'cancel-invite' ? 'cancelled' : undefined,
        summary: calSettings.summary,
        uid: calSettings.uid,
      }
    ],
    method: calSettings.method,
    sequence: calSettings.sequence,
    prodId: '//bain//ical-generator//EN',
  });

  transporter.sendMail({
    from: 'cursos-no-reply@bain.com',
    to: to,
    subject: calSettings.summary,
    html: templates[template](calSettings.descriptionData),
    alternatives: [{
      contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
      content: cal.toString()
    }]
  }, function(err, info) {
    console.log(err);
    console.log(info);
  });
}
