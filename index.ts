require('dotenv').config();

import * as express from 'express';
import { renderFile } from 'ejs';
import fetch = require('node-fetch');
import { readFile } from 'fs';
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');

const app = express();
app.use(cookieParser())

interface Settings {
    appSecret: string,
    showHeader: string
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const guid = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

app.get('/botchat', (req, res) => {
    readFile('./botchat/index.html', (err, data) => {
        const contents = data.toString();
        let settings = "";
        settings += `, user: { id: "${guid()}", name: "your name here" }`;
        if (req.cookies.settings) {
            console.log("cookie", req.cookies.settings);
            settings += `, formatOptions: { showHeader: "${req.cookies.settings.showHeader}" }`;
            if (req.cookies.settings.allowMessagesFrom)
                settings += `, allowMessagesFrom: ['${req.cookies.settings.allowMessagesFrom.replace(" ","").replace(",","','")}']`;
        }
        console.log("settings", settings);
        res.send(contents.replace("// ADD MORE CONFIG HERE", settings));
    })
});

app.use('/botchat', express.static('botchat'));

app.post('/', (req, res) => {
    res.cookie('settings', req.body)
    res.redirect('/');
});

app.get('/', (req, res) => {
    const appSecret = (req.cookies.settings && req.cookies.settings.secret) || process.env.APP_SECRET;
    console.log("query", req.query);
    const endpoint = 'https://directline.botframework.com/v3/directline/tokens/generate';
    const auth = 'Bearer';
    fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `${auth} ${appSecret}`, Accept: "application/json" }
    }).then(response =>
        response.json()
    ).then(result => {
        const token: string = result["token"];
        console.log("token", token, "retrieved at", new Date());
        renderFile("./index.html", {
            token,
            showHeader: req.cookies.settings && req.cookies.settings.showHeader, 
            secret: req.cookies.settings && req.cookies.settings.secret,
            allowMessagesFrom: req.cookies.settings && req.cookies.settings.allowMessagesFrom
        }, (err, str) => {
            if (err)
                console.log("ejs error", err);
            else
                res.send(str);
        });
    });
});

app.listen(process.env.port || process.env.PORT || 3000, () => {
    console.log('listening');
});
