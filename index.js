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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const SelectCollection = client.db('survivalDB').collection('select')

    //jwt token
    app.post('/jwt', (req, res) => {
      const { email } = req.body; // Extract the email from the request body
      console.log(email);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      console.log(token);
      res.send(token);
    });
    


    // user api 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await UserCollection.insertOne(user);
      console.log(result);
      res.send(result);
    })

    // classes apis 

    app.get('/classes', async (req, res) => {
      try {
        const classes = await ClassesCollection.find().toArray();
        res.status(200).json(classes);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: 'Failed to fetch class data' });
      }
    });


    app.post('/classes', async (req, res) => {
      const user = req.body;
      const result = await ClassesCollection.insertOne(user);
      console.log(result);
      res.send(result);
    })


// selected apis 
app.get('/select',verifyJWT, async (req, res) => {
  try {
    const userEmail = req.decoded.email; // Extract the user email from the decoded token
    const selectedClasses = await SelectCollection.find({ userEmail }).toArray();
    res.status(200).json(selectedClasses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Failed to fetch selected classes' });
  }
});



app.post('/select', async (req, res) => {
  try {
    const selectData = req.body;
    const result = await SelectCollection.insertOne(selectData);
    console.log(result);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Failed to add data to select collection' });
  }
});

app.delete('/select/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;

    // Delete the selected class by its ObjectId
    await SelectCollection.deleteOne({ _id: new ObjectId(classId) });

    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete the class' });
  }
});





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
