const express = require('express'),
    path = require('path'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    crypto = require('crypto');
const conf = require(path.join(__dirname, 'conf/server.json')),
    db_conf = require(path.join(__dirname, 'conf/db.json'));

mongoose.connect(`mongodb://${db_conf.user}:${db_conf.pwd}@${db_conf.host}:27017/${db_conf.db_name}`, {
    useNewUrlParser: true
});


const answerCardSchema = new mongoose.Schema({
        _id: Number,
        title: String,
        lang: String,
        cards: [Object]
    }),
    answerCardModel = mongoose.model('answerCardModel', answerCardSchema, 'cards');

const questionCardSchema = new mongoose.Schema({
        _id: Number,
        title: String,
        lang: String,
        cards: [String]
    }),
    questionCardModel = mongoose.model('questionCardModel', questionCardSchema, 'q_cards');



var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());


// -- DEV SERVER -- //
app.use('/', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    next();
});


app.use('/', express.static(path.join(__dirname, 'public/')));


// -- DEV -- //

app.get('/api/sessions', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(sessions));
});

// -- -- -- //


// -- CARDS -- //



app.post('/api/add-:type-pack/', (req, res) => {
    if (!req.body.title || !req.body.cards) {
        res.send(' [ERROR]: not all required parameters!');
        return;
    }
    req.body.lang = req.body.lang || 'en';

    let sourceModel = null;

    if (req.params.type == 'answer') {
        sourceModel = answerCardModel;
    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({
        title: req.body.title
    }, (err, docs) => {
        if (err) throw err;

        if (docs.length == 0) {
            sourceModel.insertMany({
                title: req.body.title,
                lang: req.body.lang,
                cards: req.body.cards
            });
            res.send('inserted!');
        } else {
            res.send('[ERROR]: package already exists!');
        }
    });
});
app.post('/api/add-:type-card/', (req, res) => {
    if (!req.body.packName || !req.body.content) {
        res.send(' [ERROR]: Baum²');
        return;
    }

    let sourceModel = null;

    if (req.params.type == 'answer') {
        sourceModel = answerCardModel;
    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({
        title: req.body.title
    }, (err, docs) => {
        if (err) throw err;

        if (docs.length == 0) {
            res.send('package does not exist!');
        } else {
            sourceModel.findOneAndUpdate({
                    title: req.body.title
                }, {
                    $addToSet: {
                        cards: req.body.content
                    }
                }, {},
                (err, doc) => {
                    res.send('inserted!');
                });
        }
    });
});
app.post('/api/add-:type-cards/', (req, res) => {
    if (!req.body.packName || req.body.cards) {
        res.send(' [ERROR]: DAVID!!!!');
        return;
    }

    let sourceModel = null;

    if (req.params.type == 'answer') {
        sourceModel = answerCardModel;
    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({
        title: req.body.title
    }, (err, docs) => {
        if (err) throw err;

        if (docs.length == 0) {
            res.send('package does not exist!');
        } else {
            sourceModel.findOneAndUpdate({
                    title: req.body.title
                }, {
                    $addToSet: {
                        cards: {
                            $each: req.body.cards
                        }
                    }
                }, {},
                (err, doc) => {
                    if (err) throw err;
                    res.send('inserted!');
                });
        }
    });
});

app.get('/api/get-:type-cards/:title', (req, res) => {
    let sourceModel = null;

    if (req.params.type == 'answer') {
        sourceModel = answerCardModel;

    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({
        title: req.params.title
    }).select({
        cards: 1,
        _id: 0
    }).exec((err, vals) => {
        if (err) throw err;

        if (vals.length == 0) {
            res.send('[ERROR]: pack not found!');
            return;
        }

        res.send(vals[0].cards);
    });
});

function randomCard(type, title, callback, amount) {
    amount = amount || 1;
    let sourceModel = null;

    if (type == 'answer') {
        sourceModel = answerCardModel;
    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({
            title: title
        }).select({
            cards: 1,
            _id: 0
        })
        .exec((err, vals) => {
            if (err) throw err;

            if (vals.length == 0) {
                res.send('[ERROR]: pack not found!');
                return;
            }

            let c = vals[0].cards,
                ret = [];

            for (let i = 0; i < amount; i++) {
                ret.push(c[Math.floor(Math.random() * c.length)]);
            }

            if (amount == 1) {
                callback(ret[0]);
            } else {
                callback(ret);
            }
        });
}
app.get('/api/random-:type-card/:title', (req, res) => {
    randomCard(req.params.type, req.params.title,
        c => {
            res.send(c);
        });
});
app.get('/api/:amount-random-:type-cards/:title', (req, res) => {
    if (isNaN(+req.params.amount)) {
        res.send('[ERROR]: amount is not a number!');
        return;
    }

    randomCard(req.params.type, req.params.title,
        cs => {
            res.send(JSON.stringify(cs));
        }, +req.params.amount);
});


// -- -- -- //

// -- GET PACKS -- //



app.get('/api/get-:type-packs/', (req, res) => {
    let sourceModel = null;

    if (req.params.type == 'answer') {
        sourceModel = answerCardModel;
    } else {
        sourceModel = questionCardModel;
    }

    sourceModel.find({}).select({
        title: 1,
        _id: 0
    }).exec((err, vals) => {
        if (err) throw err;
        res.send(vals.map(r => r.title));
    });
});



// -- -- -- //




// -- GAME LOGIC -- //



var sessions = {};


function nextCzar(token) {
    let ccz = sessions[token].round.czar;
    var ncz;

    if (!ccz) {
        ncz = sessions[token].players[0].username;
    } else {
        let cui = sessions[token].players
            .map(v => v.username).indexOf(ccz);

        ncz = sessions[token].players[++cui % sessions[token]
            .players.length].username;
    }

    sessions[token].round.answers =
        sessions[token].round.answers
        .filter(v => v.username != ncz);

    return ncz;
}



function randomPack(type, token, amount) {
    amount = amount || 1;

    let sourceArray = type == 'answer' ?
        sessions[token].a_packs :
        sessions[token].q_packs,
        ret = [];

    for (let i = 0; i < amount; i++) {
        ret.push(sourceArray[Math.floor(
            Math.random() * sourceArray.length
        )]);
    }

    return ret.length == 1 ? ret[0] : ret;
}
app.get('/api/random-:type-pack/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }

    res.send(randomPack(req.params.type, req.params.token));
});
app.get('/api/:amount-random-:type-packs/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }
    if (isNaN(+req.params.amount)) {
        res.send('[ERROR]: amount not a number!');
        return;
    }

    res.send(JSON.stringify(randomPack(
        req.params.type, req.params.token, +req.params.amount
    )));
});


function cah_answer(content, username, turned) {
    this.content = content;
    this.username = username;
    this.turned = turned || false;
}

function cah_player(username, score, cards) {
    this.username = username;
    this.score = score || 0;
    this.cards = cards || [];
}

function cah_round(id, question, blanks, czar, answers) {
    this.id = id || 0;
    this.question = question || null;
    this.blanks = blanks || 0;
    this.czar = czar || null;
    this.answers = answers || [];
}

function cah_session(a_packs, q_packs, players, started, czar, round) {
    this.started = started || false;
    this.round = round || new cah_round();

    this.a_packs = a_packs;
    this.q_packs = q_packs;
    this.players = players || [];
}


app.get('/api/play/is-player-in-:token/', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }
    if (!req.query.username) {
        res.send('[ERROR]: missing username!');
        return;
    }

    if (sessions[req.params.token].started) {
        res.send(sessions[req.params.token].players
            .map(v => v.username)
            .includes(req.query.username));
    } else {
        res.send(sessions[req.params.token].players
            .includes(req.query.username));
    }
});
app.get('/api/play/players-in-:token/', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }

    res.send(JSON.stringify(sessions[req.params.token].players));
});
app.get('/api/play/game-settings/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }
    let s = sessions[req.params.token];

    res.send(JSON.stringify({
        started: s.started,
        a_packs: s.a_packs,
        q_packs: s.q_packs
    }));
});
app.get('/api/play/round-info/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }

    res.send(JSON.stringify(sessions[req.params.token].round));
});
app.get('/api/play/lobby-exists/:token', (req, res) => {
    res.send(Object.keys(sessions).includes(req.params.token));
});
app.get('/api/play/:token-has-started/', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }

    res.send(sessions[req.params.token].started);
});
app.get('/api/play/get-:username-cards/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unknown party token!');
        return;
    }
    if (!sessions[req.params.token].started) {
        res.send('[ERROR]: game has not started yet!');
        return;
    }

    for (let p of sessions[req.params.token].players) {
        if (p.username == req.params.username) {
            let index = sessions[req.params.token].round.answers
                .map(v => v.username)
                .indexOf(req.params.username);

            let cards = p.cards.slice();

            if (index >= 0) {
                for (let a of sessions[req.params.token]
                        .round.answers[index].content) {
                    cards.splice(cards.indexOf(a), 1);
                }
            }

            res.send(JSON.stringify(cards));
            return;
        }
    }
});



app.post('/api/play/create/', (req, res) => {
    if (!req.body.a_packs || !req.body.q_packs) {
        res.send('[ERROR]: no packages selected!');
        return;
    }
    if (!req.body.username) {
        res.send('[ERROR]: no username!');
        return;
    }

    var r_token;
    do {
        r_token = crypto.randomBytes(conf.token_length / 2).toString('hex');
    } while (Object.keys(sessions).includes(r_token));

    req.body.a_packs = Array.isArray(req.body.a_packs) ?
        req.body.a_packs : [req.body.a_packs];
    req.body.q_packs = Array.isArray(req.body.q_packs) ?
        req.body.q_packs : [req.body.q_packs];

    sessions[r_token] = new cah_session(req.body.a_packs, req.body.q_packs,
        [req.body.username]);

    res.cookie(conf.token_name, r_token);
    res.cookie(conf.cookie_username, req.body.username);
    res.send(r_token);
});
app.post('/api/play/join/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!req.body.username) {
        res.send('[ERROR]: no username!');
        return;
    }
    if (sessions[req.params.token].players
        .includes(req.body.username)) {
        res.send('[ERROR]: username already taken!');
        return;
    }
    if (sessions[req.params.token].started &&
        sessions[req.params.token].players.map(v => v.username)
        .includes(req.body.username)) {
        res.send('[ERROR]: username already taken!');
        return;
    }

    res.cookie(conf.token_name, req.params.token);
    res.cookie(conf.cookie_username, req.body.username);

    if (sessions[req.params.token].started) {
        let pla = new cah_player(req.body.username);
        for (let p of randomPack('answer', req.params.token,
                conf.answer_card_amount)) {
            randomCard('answer', p, c => {
                pla.cards.push(c);
            });
        }

        sessions[req.params.token].players.push(pla);
    } else {
        sessions[req.params.token].players.push(req.body.username);
    }
    res.send(req.params.token);
});
app.post('/api/play/leave/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!req.body.username) {
        res.send('[ERROR]: no username!');
        return;
    }

    if (sessions[req.params.token].started) {
        if (!sessions[req.params.token].players
            .map(v => v.username)
            .includes(req.body.username)) {
            res.send('[ERROR]: not in party!');
            return;
        }
        if (sessions[req.params.token].round.czar ==
            req.body.username) {
            sessions[req.params.token].round.czar = 
                nextCzar(req.params.token);
        }

        sessions[req.params.token].players.splice(
            sessions[req.params.token].players
            .map(v => v.username)
            .indexOf(req.body.username), 1
        );
        sessions[req.params.token].round.answers =
            sessions[req.params.token].round.answers
            .filter(v => v.username != req.body.username);
    } else {
        if (!sessions[req.params.token].players
            .includes(req.body.username)) {
            res.send('[ERROR]: not in party!');
            return;
        }

        sessions[req.params.token].players.splice(
            sessions[req.params.token].players
            .indexOf(req.body.username), 1
        );
    }

    if (sessions[req.params.token].players.length == 0) {
        delete sessions[req.params.token];
    }

    res.send(req.params.token);
});
app.post('/api/play/start/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (sessions[req.params.token].started) {
        res.send('[ERROR]: game has already started!');
        return;
    }
    if (!req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!sessions[req.params.token].players.includes(req.cookies[conf.cookie_username])) {
        res.send('[ERROR]: not in party!');
        return;
    }

    sessions[req.params.token].started = true;
    for (let i = 0; i < sessions[req.params.token].players.length; i++) {
        sessions[req.params.token].players[i] = new cah_player(sessions[req.params.token].players[i]);
    }

    sessions[req.params.token].round.czar =
        nextCzar(req.params.token);

    randomCard(
        'question',
        randomPack('question', req.params.token),
        c => {
            sessions[req.params.token].round.question = c;
            sessions[req.params.token].round.blanks =
                (c.match(/{\\\\__\/}/g) || []).length;
        }
    );

    for (let i = 0; i < sessions[req.params.token].players
        .length; i++) {
        for (let p of randomPack('answer', req.params.token,
                conf.answer_card_amount)) {
            randomCard('answer', p, c => {
                sessions[req.params.token].players[i].cards
                    .push(c);
            });
        }
    }

    res.send(req.params.token);
});
app.post('/api/play/add-answer/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!sessions[req.params.token].started) {
        res.send('[ERROR]: game has not started yet!');
        return;
    }
    if (!req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!req.body.username ||
        !req.body.content) {
        res.send('[ERROR]: no answer sent!');
        return;
    }
    if (!sessions[req.params.token].players
        .map(v => v.username)
        .includes(req.body.username)) {
        res.send('[ERROR]: not in party!');
        return;
    }

    let a_users = sessions[req.params.token].round.answers
        .map(v => v.username);

    if (a_users.includes(req.body.username)) {
        if (sessions[req.params.token].round.answers[
                a_users.indexOf(req.body.username)
            ].content.length >= sessions[req.params.token]
            .round.blanks) {
            sessions[req.params.token].round.answers[
                a_users.indexOf(req.body.username)
            ] = new cah_answer([req.body.content],
                req.body.username);
        } else {
            sessions[req.params.token].round.answers[
                a_users.indexOf(req.body.username)
            ].content.push(req.body.content);
        }
    } else {
        sessions[req.params.token].round.answers.push(
            new cah_answer([req.body.content], req.body.username)
        );
    }

    res.send(req.params.token);
});
app.post('/api/play/remove-card/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!sessions[req.params.token].started) {
        res.send('[ERROR]: game has not started yet!');
        return;
    }
    if (!req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!req.body.index) {
        res.send('[ERROR]: no index specified!');
        return;
    }
    if (!sessions[req.params.token].players
        .map(v => v.username)
        .includes(req.cookies[conf.cookie_username])) {
        res.send('[ERROR]: user not in party!');
        return;
    }

    let p_index = sessions[req.params.token].players
        .map(v => v.username)
        .indexOf(req.cookies[conf.cookie_username]);

    if (sessions[req.params.token].players[p_index].cards.length <=
        sessions[req.params.token].round.blanks) {

        res.send('[ERROR]: too few cards!');
        return;
    }

    console.log("Index: " + req.body.index);
    console.log(sessions[req.params.token]
        .players[p_index].cards);

    sessions[req.params.token].players[p_index].cards.splice(
        +req.body.index, 1);
    res.send(req.param.token);
});
app.post('/api/play/turn-card/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!sessions[req.params.token].started) {
        res.send('[ERROR]: game has not started yet!');
        return;
    }
    if (!req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!sessions[req.params.token].round.czar ==
        req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: you are not the czar!');
        return;
    }
    if (!req.body.username) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!sessions[req.params.token].players
        .map(v => v.username)
        .includes(req.body.username)) {
        res.send('[ERROR]: user not in party!');
        return;
    }

    let index = sessions[req.params.token].round.answers
        .map(v => v.username)
        .indexOf(req.body.username);
    sessions[req.params.token].round.answers[index].turned = true;

    res.send(req.params.token);
});

function nextRound(token) {
    sessions[token].round.czar =
        nextCzar(token);

    randomCard(
        'question',
        randomPack('question', token),
        c => {
            sessions[token].round.question = c;
            sessions[token].round.blanks =
                (c.match(/{\\\\__\/}/g) || []).length;
        }
    );

    for (let i = 0; i < sessions[token].round.answers.length; i++) {
        let u_ind = sessions[token].players.map(v => v.username)
            .indexOf(sessions[token].round.answers[i].username);

        for (let a of sessions[token].round.answers[i].content) {
            randomCard('answer', randomPack('answer', token),
                c => {
                    sessions[token].players[u_ind].cards[
                        sessions[token].players[u_ind].cards
                        .indexOf(a)
                    ] = c;
                });
        }
    }

    for (let i = 0; i < sessions[token].players.length; i++) {
        for (let j = sessions[token].players[i].cards.length; j < conf.answer_card_amount; j++) {
            randomCard('answer', randomPack('answer', token),
                c => {
                    sessions[token].players[i].cards[j] = c;
                });
        }
    }

    sessions[token].round.answers = [];
    sessions[token].round.id++;
}
app.post('/api/play/choose-winner/:token', (req, res) => {
    if (!Object.keys(sessions).includes(req.params.token)) {
        res.send('[ERROR]: unkown party token!');
        return;
    }
    if (!sessions[req.params.token].started) {
        res.send('[ERROR]: game has not started yet!');
        return;
    }
    if (!req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: no username specified!');
        return;
    }
    if (!sessions[req.params.token].round.czar ==
        req.cookies[conf.cookie_username]) {
        res.send('[ERROR]: you are not the czar!');
        return;
    }
    if (!req.body.username) {
        res.send('[ERROR]: no winning username specified!');
        return;
    }
    if (!sessions[req.params.token].players
        .map(v => v.username)
        .includes(req.body.username)) {
        res.send('[ERROR]: winner not in party!');
        return;
    }

    let index = sessions[req.params.token].players
        .map(v => v.username)
        .indexOf(req.body.username);
    sessions[req.params.token].players[index].score++;

    nextRound(req.params.token);
    res.send(req.params.token);
});



app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});


// -- -- -- -- -- //



app.listen(conf.port, () => console.log(` [SERVER]: Listening on :${conf.port} ... `));