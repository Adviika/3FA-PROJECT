const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

var server=http.createServer(app);
server.listen(8000);

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost', // or your db host
  user: 'root',      // or your db username
  password: '3078',      // or your db password
  database: 'proj'   // replace with your db name
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database');
});

app.get('/', function(request,response){
  fs.readFile('login.html', function(Error,Res){
  if(!Error)
  {
  response.writeHead(200,{'content-type':'text/html'});
  response.write(Res);
  }
  });
  });

// Handle login request (without bcrypt)
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Query the database for the user with the given email and password
  const query = 'SELECT * FROM userdetails WHERE email = ? AND pass = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      res.send('Login successful!');
    } else {
      res.send('Incorrect email or password');
    }
  });
});
  


