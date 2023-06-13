const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
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
    // await 
    client.connect();

    const ClassesCollection = client.db('survivalDB').collection('Classes')
    const UserCollection = client.db('survivalDB').collection('users')
    const SelectCollection = client.db('survivalDB').collection('select')
    const PaymentCollection = client.db("survivalDB").collection("payments");
    const EnrollCollection = client.db("survivalDB").collection("enroll");

    //jwt token
    app.post('/jwt', (req, res) => {
      const { email } = req.body; // Extract the email from the request body
      // console.log(email);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      // console.log(token);
      res.send(token);
    });
    


    // user api 
    app.get('/users', async (req, res) => {
      const result = await UserCollection.find().toArray();
      // console.log(result);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await UserCollection.insertOne(user);
      // console.log(result);
      res.send(result);
    })

    app.put('/users/:id/role', async (req, res) => {
      try {
        const userId = req.params.id;
        const { role } = req.body;
    
        // Update the user role in the database
        const result = await UserCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role } }
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        res.json({ message: 'User role updated successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await UserCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await UserCollection.findOne(query);
      const result = { admin: user?.role === 'instructor' }
      res.send(result);
    })
    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await UserCollection.findOne(query);
      const result = { admin: user?.role === 'student' }
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
    app.get('/approveclasses', async (req, res) => {
      try {
        const classes = await ClassesCollection.find({ status:'approved' }).toArray();
        res.status(200).json(classes);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: 'Failed to fetch class data' });
      }
    });


// Update a class

app.put('/classes/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const { className, availableSeats, price } = req.body;

    // Update the class in the database
    const result = await ClassesCollection.updateOne(
      { _id: new ObjectId(classId) }, // Match the document based on the class ID
      {
        $set: {
          className: className,
          availableSeats: availableSeats,
          price: price
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.put('/manageclasses/:classId', async (req, res) => {
  const classId = req.params.classId;
  const { status } = req.body;

  try {
    const query = { _id:new ObjectId(classId) };
    const update = { $set: { status } };

    const classToUpdate = await ClassesCollection.findOneAndUpdate(query, update);

    if (classToUpdate) {
      res.status(200).json({ message: 'Class status updated successfully' });
    } else {
      res.status(404).json({ error: 'Class not found' });
    }
  } catch (error) {
    console.log('Error updating class status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/classes/:classId/feedback', async (req, res) => {
  const classId = req.params.classId;
  const { feedback } = req.body;

  try {
    const query = { _id:new ObjectId(classId) };
    const update = { $set: { feedback } };

    const classToUpdate = await ClassesCollection.findOneAndUpdate(query, update);

    if (classToUpdate) {
      res.status(200).json({ message: 'Feedback updated successfully' });
    } else {
      res.status(404).json({ error: 'Class not found' });
    }
  } catch (error) {
    console.log('Error updating feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



    app.get('/instructor-classes', verifyJWT, async (req, res) => {
      try {
        const userEmail = req.decoded.email; // Extract the user email from the decoded token
    
        // Fetch classes where the instructor email matches the user email
        const classes = await ClassesCollection.find({ instructorEmail: userEmail }).toArray();
    
        res.status(200).json(classes);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: 'Failed to fetch instructor classes' });
      }
    });
    


    app.post('/classes', async (req, res) => {
      const user = req.body;
      const result = await ClassesCollection.insertOne(user);
      // console.log(result);
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
    const { classId, userEmail } = selectData;

    // Check if the user has already selected the class
    const existingSelection = await SelectCollection.findOne({ classId, userEmail });
    if (existingSelection) {
      return res.status(400).json({ error: true, message: ' already selected ' });
    }

    const result = await SelectCollection.insertOne(selectData);
    // console.log(result);
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


//enroll apis
app.get('/enrolled-classes', verifyJWT, async (req, res) => {
  try {
    const userEmail = req.decoded.email;
    console.log(userEmail)
    const enrolledClasses = await EnrollCollection.find({ userEmail }).toArray();
    res.status(200).json(enrolledClasses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Failed to fetch enrolled classes' });
  }
});



 // create payment intent
 app.post('/create-payment-intent', verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})


app.post('/payments', verifyJWT, async (req, res) => {
  const payment = req.body;
  const insertResult = await PaymentCollection.insertOne(payment);
  // console.log(payment.classItem);

  // Increase the enroll value of ClassesCollection
  const enrollFilter = { _id: new ObjectId(payment.classItem.classId) };
  const enrollUpdate = { $inc: { enroll: 1 } };
  await ClassesCollection.updateOne(enrollFilter, enrollUpdate);

  const insertEnroll = await EnrollCollection.insertOne(payment.classItem);

  const filter = { _id: new ObjectId(payment.classItem.classId) };
  const update = { $inc: { availableSeats: -1 } };
  ClassesCollection.updateOne(filter, update, function(err, result) {
    console.log(`${result.modifiedCount} document(s) updated`);
  });

  const query = { _id: new ObjectId(payment.classItem._id) };
  const deleteResult = await SelectCollection.deleteOne(query);

  res.send({ insertResult, deleteResult, insertEnroll });
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
