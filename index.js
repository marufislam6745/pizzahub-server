import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';



const app = express()
const port = 5000

app.use(express.json())
app.use(cors())

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB()
const myDB = mongoClient.db('PizzaHub')

const allPizza = myDB.collection('allpizza')
const orderItem = myDB.collection('orderitem')


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/addmenu', async (req, res) => {
    const data = req.body
    const result = await allPizza.insertOne(data)
    res.send({ result })
})

app.get('/pizza', async (req, res) => {
    const query = {}
    if (req.query) {

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } },
                { size: { $regex: req.query.search, $options: 'i' } },
                { restaurantName: { $regex: req.query.search, $options: 'i' } },
                { location: { $regex: req.query.search, $options: 'i' } },
            ]
        }
    }

    const result = await allPizza.find(query).toArray()
    res.send(result)

})
//http://localhost:5000/pizzaId/id
app.get('/pizzaId/:id', async (req, res) => {
    const { id } = req.params
    const result = await allPizza.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.get('/pizza/:email', async (req, res) => {
    const { email } = req.params
    const result = await allPizza.find({ email: email }).toArray()
    res.send(result)
})

app.delete('/pizza/:id', async (req, res) => {
    const id = req.params.id
    const result = await allPizza.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

//http://localhost:5000/pizza
app.get('/pizzaSection', async (req, res) => {

    const result = await allPizza.find().sort({ _id: 1 }).limit(6).toArray()
    res.send(result)
})


//order item 
app.post('/order', async (req, res) => {
    const data = req.body
    delete data._id
    const result = await orderItem.insertOne(data)
    res.send(result)
})

app.get('/myOrder/:email', async (req, res) => {
    const email = req.params.email
    const result = await orderItem.find({ useremail: email }).toArray()
    res.send(result)
})

app.delete('/myOrder/:id', async (req, res) => {
    const id = req.params.id
    const result = await orderItem.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})