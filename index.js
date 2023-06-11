const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  // bearer token
  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fwntuaw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const ClassesCollection = client.db('survivalDB').collection('Classes')
    const UserCollection = client.db('survivalDB').collection('users')

    //jwt token
    app.post('/jwt', (req, res) => {
      const email = req.body
      console.log(email)
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      })
      console.log(token);
      res.send(token)
    })


    // user api 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await UserCollection.insertOne(user);
      console.log(result);
      res.send(result);
    })

    // classes apis 
    app.post('/classes', async (req, res) => {
      const user = req.body;
      const result = await ClassesCollection.insertOne(user);
      console.log(result);
      res.send(result);
    })







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running');
});

app.listen(port, () => {
  console.log(`Server is on port ${port}`);
});
