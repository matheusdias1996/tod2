require('dotenv').config();
const bcrypt = require('bcryptjs')
const fs = require('fs')
const mongoose = require('mongoose')

global.__root   = __dirname + '/';

require('../db')

const Class = require('../class/Class')
const Subject = require('../subject/Subject')
const User = require('../user/User')

const createUser = (email, callback) => {
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
                    } else {
                        callback(user)
                    }
                })
            })
        } else {
            callback(user)
        }
    })
}

const createSubject = (name, students, teachers, trained, callback) => {
    Subject.create({
        name,
        students,
        teachers,
        trained,
    }, (err, subject) => {
        if (err) {
            console.log(err)
        } else {
            callback(subject)
        }
    })
}

const readLines = (lines, index, students, teachers, trained, callback) => {
    if (index < lines.length) {
        const line = lines[index].split(',')
        const studentEmail = line[0]
        const alreadyAttended = line[1] === '1'
        const teacherEmail = line[2]
        createUser(studentEmail.toLowerCase(), student => {
            alreadyAttended ? trained.push(student._id) : students.push(student._id)
            if (teacherEmail) {
                createUser(teacherEmail.toLowerCase(), teacher => {
                    teachers.push(teacher._id)
                    readLines(lines, index + 1, students, teachers, trained, callback)
                })
            } else {
                readLines(lines, index + 1, students, teachers, trained, callback)
            }
        })
    } else {
        callback(students, teachers, trained)
    }
}

const readFiles = (files, index) => {
    if (index < files.length) {
        const file = files[index]
        const subjectName = file.slice(21).replace('.csv','')
        fs.readFile(__root + file, 'utf-8', (err, content) => {
            if (!err) {
                const lines = content.split('\n').slice(1).map(line => line.replace('\r', ''))
                readLines(lines, 0, [], [], [], (students, teachers, trained) => {
                    createSubject(subjectName, students, teachers, trained, (subject) => {
                        console.log(subject.name, ' imported!')
                        readFiles(files, index + 1)
                    })
                })
            }
        })
    } else {
        console.log('Finish!')
        mongoose.connection.close()
    }
}

fs.readdir(__root, (err, files) => {
    files = files.filter(file => file.length > 25)
    readFiles(files, 0)
})
