module.exports = {
  findUserErrorHandling: function(res, callback) {
    return function(err, user) {
      if (err) {
        console.error(err);
        return res.status(500).send({ err: { msg: 'Error on the server.' } });
      }
      if (!user) return res.status(404).send({ err: { msg: 'No user found.' } });

      callback(user);
    }
  }
}
