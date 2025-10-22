const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const port = process.env.PORT || 3000;
const app = express();


app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db('WhereIsIt-DB');
    const whereIsItCollection = database.collection('items');
    const recoveredCollection = database.collection('recoveredItems');





    app.get('/items/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const item = await whereIsItCollection.findOne({ _id: new ObjectId(id) });
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
      } catch (error) {
        res.status(400).json({ message: "Invalid ID" });
      }
    });



    app.get("/items", async (req, res) => {
      try {
        const { userEmail, status } = req.query;

        const query = {};
        if (userEmail) query.userEmail = userEmail;
        if (status) query.status = status;

        const items = await whereIsItCollection.find(query).toArray();
        res.status(200).json(items);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch items" });
      }
    });


    
    app.get("/latestItems", async (req, res) => {
      try {
        const latestItems = await whereIsItCollection
          .find()
          .sort({ date: -1 }) 
          .limit(6)
          .toArray();

        res.status(200).json(latestItems);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch latest items." });
      }
    });




    app.post('/items', async (req, res) => {
      try {
        const newItem = req.body;
        const result = await whereIsItCollection.insertOne(newItem);
        res.status(201).json({ insertedId: result.insertedId });
      } catch (error) {
        console.error('Error inserting item:', error);
        res.status(500).json({ message: 'Failed to add item' });
      }
    });


    app.post('/recover', async (req, res) => {
      const recoveryData = req.body;
      const { itemId } = recoveryData;

      try {

        const existing = await recoveredCollection.findOne({ itemId });
        if (existing) {
          return res.status(400).json({ message: 'Item already recovered' });
        }


        await recoveredCollection.insertOne(recoveryData);

        await whereIsItCollection.updateOne(
          { _id: new ObjectId(itemId) },
          { $set: { status: 'recovered' } }
        );

        res.json({ message: 'Item marked as recovered' });
      } catch (error) {
        console.error('Recovery failed:', error);
        res.status(500).json({ message: 'Recovery process failed' });
      }
    });



    app.put("/items/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = { ...req.body };

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      try {
        delete updatedData._id;

        const result = await whereIsItCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "No update performed" });
        }

        res.json({ message: "Item updated successfully" });
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Failed to update item" });
      }
    });





    app.delete("/items/:id", async (req, res) => {
      const { id } = req.params;
      const result = await whereIsItCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });


    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Welcome to WhereIsIt server');
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
