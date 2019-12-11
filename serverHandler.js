
const bodyParser = require('body-parser');
const path = require('path');
const sqlite = require("sqlite");
const express = require('express');
const dbPromise = sqlite.open("./data.sqlite");
const cookieParser = require("cookie-parser");
const uuidv4 = require("uuid/v4");

// Setting our local port as 3000
const port = 3000
const app = express();

// Handlebars setup
const exphbs = require ("express-handlebars");
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));
app.use(cookieParser());

const authorize = async (req, res, next) => {
  const db = await dbPromise;
  const token = req.cookies.authToken;
  console.log("token from authorize:", token);
  if (!token) {
    return next();
  }

  const authToken = await db.get(
    "SELECT * FROM authTokens WHERE token=?",
    token
  );
  console.log("authToken from authorize", authToken);
  if (!authToken) {
    return next();
  }

  const user = await db.get(
    "SELECT email, id FROM users WHERE id=?",
    authToken.userId
  );
  console.log("user from authorize", user);

  req.user = user;
  next();
};

app.use(authorize);

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
app.get('/about.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/about.html'));
});
app.get('/createAccount.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/createAccount.html'));
});
app.get('/howToUse.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/howToUse.html'));
});
app.get('/index.html', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
// Special library handler checks to see if someone is an authorized user
app.get('/myLibrary.handlebars', async (req, res) => {
    const db = await dbPromise;
    const token = req.cookies.authToken;
    const authToken = await db.get(
        "SELECT * FROM authTokens WHERE token=?",
        token
      );
    if (!authToken)
    {
        res.sendFile(path.join(__dirname + '/noLogin.html'));
    }
    else
    {
        res.render("myLibrary", { error: "error in loading page" });
    }
});

// Search Request Handler
app.post('/search', async (req,res) => {
    const db = await dbPromise;
    const search = await db.get(
        "SELECT * FROM pdfs WHERE isbn =? OR author =? OR title=?", 
        req.body.search,
        req.body.search,
        req.body.search
    );
    console.log(search);
    if(search)
    {

    }
    else
    {

    }
   res.render("searchResults", { search : search});
});

app.post('/download', async(req, res) => {
    const fileName = req.body.fileName;
    res.download(path.join(__dirname + '/public/pdfs/' + fileName));
});

// User Creation
app.post('/create', async (req, res) => {
    const db = await dbPromise;
    console.log("User Creation");
    await db.run(
        "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?);",
        req.body.firstName,
        req.body.lastName,
        req.body.email,
        req.body.password
    );
    const user = await db.get("SELECT * FROM users WHERE email=?", req.body.email);
    const token = uuidv4();
    await db.run(
        "INSERT INTO authTokens (token, userId) VALUES (?, ?)",
        token,
        user.id
    );
    res.cookie("authToken", token);
    console.log(user);
    console.log(token);
    res.redirect("/");
});

// Login Handler
app.post('/login', async (req, res) => {
    const db = await dbPromise;
    const email = req.body.email;
    const password = req.body.password;
    const user = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (!user) {
        console.log("User not found");
    }
    else if (password != user.password)   {
        console.log("Password incorrect");
    }
    else {
        const token = uuidv4();
        await db.run(
            "INSERT INTO authTokens (token, userId) VALUES (?, ?)",
            token,
            user.id
        );
        res.cookie("authToken", token);
        console.log("Login successful");
        console.log(user);
        res.redirect("/");
    }
   
});

// Proto download handler, will be implemented more intelligently later
app.get('/download1', async (req, res) => {
    res.download(path.join(__dirname + '/public/pdfs/frankenstein.pdf'));
});
app.get('/download2', async (req, res) => {
    res.download(path.join(__dirname + '/public/pdfs/Moby_Dick.pdf'));
});
app.get('/download3', async (req, res) => {
    res.download(path.join(__dirname + '/public/pdfs/modestproposal.pdf'));
});
app.get('/download4', async (req, res) => {
    res.download(path.join(__dirname + '/public/pdfs/dracula.pdf'));
});
app.get('/download5', async (req, res) => {
    res.download(path.join(__dirname + '/public/pdfs/The_Scarlet_Letter.pdf'));
});

// Final server setup 
const setup = async () => {	
        const db = await dbPromise;
        db.migrate({ force: "last"}); 
        app.listen(3000, async () => {
            console.log("listening on http://localhost:3000");
        });
};

setup();

