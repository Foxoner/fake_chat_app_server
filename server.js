const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const { response } = require('express');

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5433,
      user : 'postgres',
      password : '452263632',
      database : 'chat_app'
    }
  });


const app = express();

app.use(cors())

app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.send('Success');
});

app.get('/get_dialogs', (req, res) => {
    db.select('*').from('dialogs')
    .then(data => res.json(data))
    .catch(err => res.status(400).json('Unable to get data'))
})

app.get('/get_messages', (req, res) => {
    db.select('*').from('messages')
    .then(data => res.json(data))
    .catch(err => res.status(400).json('Unable to get data'))
})

app.post('/send_message', (req, res) => {
    const { dialog_id, avatar, text, unread, isme } = req.body;
    db.transaction(trx => {
        trx.insert({
            dialog_id: dialog_id,
            avatar: avatar,
            text: text,
            created_at: new Date(),
            unread: unread,
            isme: isme
        })
        .into('messages')
        .returning('created_at')
        .then(time => {
            return trx('dialogs')
            .where('dialog_id', '=', dialog_id)
            .update({
                updated_at: time[0].created_at,
                text: text
            })
            .then(response => res.json('Success'))
        })
        .then(trx.commit)
		.catch(trx.rollback)
    })
    .catch(err => res.status(400).json('Unable to send the message'))
})

app.post('/register', (req,res) => {
    const { email, name, password } = req.body;
	if(!email || !name || !password) {
		return res.status(400).json('Incorrect form submission')
	}
	const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            email: email,
            fullname: name,
            hash: hash
        })
        .into('users')
        .returning('email')
        .then(email => {
            return trx('emails')
            .returning('*')
            .insert({
                email: email[0].email
            })
            .then(response => res.json('You have registred'))
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(err => res.status(400).json('Unable to register'))
    
})

app.post('/signin', (req,res) => {
    const { email, password } = req.body;
    if(!email || !password) {
		return res.status(400).json('Incorrect form submission')
	}
    db.select('email', 'hash').from('users')
		.where('email', '=', email)
		.then(data => {
			const isValid = bcrypt.compareSync(password, data[0].hash);
			if (isValid) {
				return res.json('Success')
			} else {
				res.status(400).json('Wrong data')
			}
		})
		.catch(err => res.status(400).json('Wrong data'))
})

app.listen(3001, () => {
	console.log(`App is runing on port 3001`);
});