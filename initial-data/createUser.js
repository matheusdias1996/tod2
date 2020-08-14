require('dotenv').config();
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

global.__root   = __dirname + '/';

require('../db')

const User = require('../user/User')

const createUser = (email) => {
    const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    User.findOne({ email }, (err, user) =>  {
        if (!err && !user) {
            bcrypt.hash(name, 10, function(err, hashedPassword) {
                User.create({
                  name,
                  email,
                  password: hashedPassword,
                  isVerified: true,
                }, function (err, user) {
                    if (err) {
                        console.log(err)
                    }
                })
            })
        } else {
            console.log('User already exists.')
        }
    })
}

createUser('eduarda.dreux@bain.com')
