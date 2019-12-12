
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

// Authorization token handler
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
    "SELECT email, id, firstName FROM users WHERE id=?",
    authToken.userId
  );

  req.user = user;
  next();
};

app.use(authorize);

// Handles page navigation
app.get('/', async (req, res) => {
    res.render("index", {user: req.user});
});
app.get('/about', function(req, res) {
    res.render("about", {user: req.user});
});
app.get('/createAccount', function(req, res) {
    res.render("createAccount", {user: req.user});
});
app.get('/howToUse', function(req, res) {
    res.render("howToUse", {user: req.user});
});
app.get('/index', function(req, res) {
    res.render("index", {user: req.user});
});

// Special library access handler checks to see if someone is an authorized user
app.get('/myLibrary', async (req, res) => {
    const db = await dbPromise;
    if (!req.user)
    {
        res.sendFile(path.join(__dirname + '/noLogin.html'));
    }
    else
    {
        library = await db.all(
            "SELECT * FROM pdfs ORDER BY title ASC"
        );
        res.render("myLibrary", {user: req.user, library: library});

    }
});
// Version of library handler with sorting options
app.post('/myLibrary', async (req, res) => {
    const db = await dbPromise;
    if (!req.user)
    {
        res.sendFile(path.join(__dirname + '/noLogin.html'));
        
    }
    else
    {
        const sort = req.body.sortType;
        var library;
        if(sort == "author")
        {
            library = await db.all(
                "SELECT * FROM pdfs ORDER BY author ASC"
            );
        }
        else if(sort == "isbn")
        {
            library = await db.all(
                "SELECT * FROM pdfs ORDER BY isbn ASC"
            );
        }
        else
        {
            library = await db.all(
                "SELECT * FROM pdfs ORDER BY title ASC"
            );
        }
        res.render("myLibrary", {user: req.user, library: library});
    }
});
app.post('/myLibraryRating', async (req, res) => {
    const db = await dbPromise;
    const rating = parseInt(req.body.rating, 10);
    const review = await db.get(
        "SELECT reviews, numReviews, average FROM pdfs WHERE isbn = ?",
        req.body.book
    );
    console.log(review);
    const sum = review.reviews + rating;
    const numReviews = review.numReviews + 1;
    const average = sum/numReviews;
    await db.run(`UPDATE pdfs
        SET
            reviews = ?,
            numReviews = ?,
            average = ?
        WHERE
            isbn = ?`,
        sum,
        numReviews,
        average,
        req.body.book
    );
    res.redirect("/myLibrary");
});

// User Page
app.get('/userPage', async (req,res) => {
    const db = await dbPromise;
    const downloads = await db.all("SELECT * FROM downloads WHERE userId = ?",
        req.user.id
    );
    console.log(downloads);
    res.render("userPage", {user: req.user, downloads: downloads});
});

// Search Request Handler
app.post('/search', async (req,res) => {
    const db = await dbPromise;
    if (!req.user)
    {
        res.sendFile(path.join(__dirname + '/noLogin.html'));
        
    }
    else
    {
        const search = await db.get(
            "SELECT * FROM pdfs WHERE isbn =? OR upper(author) =? OR upper(title)=?", 
            req.body.search,
            req.body.search.toUpperCase(),
            req.body.search.toUpperCase()
        );
        console.log(search);
        const reviewsExist = new Boolean(search.numReviews > 0);
        res.render("searchResults", { search : search, reviewsExist: reviewsExist});
    }
});
app.post('/searchRating', async (req, res) => {
    const db = await dbPromise;
    const rating = parseInt(req.body.rate, 10);
    const review = await db.get(
        "SELECT reviews, numReviews, average FROM pdfs WHERE isbn = ?",
        req.body.book
    );
    console.log(review);
    const sum = review.reviews + rating;
    const numReviews = review.numReviews + 1;
    const average = sum/numReviews;
    await db.run(`UPDATE pdfs
        SET
            reviews = ?,
            numReviews = ?,
            average = ?
        WHERE
            isbn = ?`,
        sum,
        numReviews,
        average,
        req.body.book
    );
});

// Download Handler
app.post('/download', async (req, res) => {
    const db = await dbPromise;
    const fileName = req.body.fileName;
    const exists = await db.get(`SELECT * FROM downloads
        WHERE 
            userId = ?
        AND
            download = ?`,
        req.user.id,
        fileName);
    if(!exists)
    {
        await db.run("INSERT INTO downloads (userId, download) VALUES (?, ?);",
            req.user.id,
            fileName
        );
    }
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

// Logout handler
// TODO
app.get('/logout', function (req, res) {
    res.clearCookie();
    res.redirect("/");
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

